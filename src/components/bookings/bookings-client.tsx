"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, CheckCircle2, Clock, Mail, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/misc";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  declineBooking,
} from "@/lib/actions/booking";
import type { BookingWithClient } from "@/lib/data/booking";
import type { BookingStatus } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const SECTIONS: { status: BookingStatus; label: string }[] = [
  { status: "pending", label: "Pending requests" },
  { status: "confirmed", label: "Confirmed" },
  { status: "completed", label: "Completed" },
  { status: "declined", label: "Declined" },
  { status: "cancelled", label: "Cancelled" },
];

/**
 * Format a UTC start/end range in a given IANA timezone (native Intl). Falls
 * back to UTC if the timezone name isn't recognized by the JS/ICU tz set — a
 * booking's client_timezone comes from a public write and Postgres accepts some
 * names (e.g. "Factory") that Intl rejects, which would otherwise throw here.
 */
function fmtRange(startISO: string, endISO: string, tz: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const build = (zone: string) => {
    const date = s.toLocaleDateString("en-US", {
      timeZone: zone,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const t = (d: Date) =>
      d.toLocaleTimeString("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" });
    return { date, range: `${t(s)}–${t(e)}` };
  };
  try {
    return build(tz);
  } catch {
    const r = build("UTC");
    return { date: r.date, range: `${r.range} UTC` };
  }
}

export function BookingsClient({
  bookings,
  timezone,
}: {
  bookings: BookingWithClient[];
  timezone: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  async function run(
    id: string,
    fn: (id: string) => Promise<{ ok: true } | { error: string }>,
    okMsg: string,
  ) {
    setBusyId(id);
    const res = await fn(id);
    setBusyId(null);
    if ("error" in res) return toast(res.error, "error");
    toast(okMsg);
    router.refresh();
  }

  const groups = SECTIONS.map((s) => ({
    ...s,
    items: bookings.filter((b) => b.status === s.status),
  })).filter((g) => g.items.length > 0);

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No booking requests yet"
        description="When someone requests a call through your link, it shows up here to confirm or decline."
      />
    );
  }

  function Row({ b }: { b: BookingWithClient }) {
    const primary = fmtRange(b.requested_start_at, b.requested_end_at, timezone);
    const clientView =
      b.client_timezone && b.client_timezone !== timezone
        ? fmtRange(b.requested_start_at, b.requested_end_at, b.client_timezone)
        : null;
    return (
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{b.guest_name}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[b.status]}`}
            >
              {b.status}
            </span>
            {b.client && (
              <Link href={`/clients/${b.client.id}`} className="text-xs text-primary hover:underline">
                {b.client.name}
              </Link>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {primary.date} · {primary.range}
              <span className="text-muted-foreground/70">your time ({timezone})</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {b.guest_email}
            </span>
          </div>
          {clientView && (
            <p className="mt-0.5 text-xs text-muted-foreground/80">
              {clientView.range} their time ({b.client_timezone})
            </p>
          )}
          {b.notes && <p className="mt-1 text-xs text-muted-foreground">“{b.notes}”</p>}
        </div>

        <div className="flex shrink-0 gap-2">
          {b.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => run(b.id, confirmBooking, "Booking confirmed")}
                loading={busyId === b.id}
              >
                <Check className="h-4 w-4" />
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeclineId(b.id)}
                disabled={busyId === b.id}
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </>
          )}
          {b.status === "confirmed" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => run(b.id, completeBooking, "Marked completed")}
                loading={busyId === b.id}
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setCancelId(b.id)}
                disabled={busyId === b.id}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.status} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label} ({g.items.length})
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {g.items.map((b) => (
                <Row key={b.id} b={b} />
              ))}
            </CardContent>
          </Card>
        </section>
      ))}

      <ConfirmDialog
        open={declineId !== null}
        onClose={() => setDeclineId(null)}
        onConfirm={() => {
          const id = declineId;
          setDeclineId(null);
          if (id) run(id, declineBooking, "Request declined");
        }}
        destructive
        title="Decline this request?"
        description="The guest's request will be marked declined. (Email notifications are a follow-up.)"
        confirmLabel="Decline"
      />
      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={() => {
          const id = cancelId;
          setCancelId(null);
          if (id) run(id, cancelBooking, "Booking cancelled");
        }}
        destructive
        title="Cancel this booking?"
        description="The confirmed booking will be marked cancelled."
        confirmLabel="Cancel booking"
      />
    </div>
  );
}
