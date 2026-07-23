"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, CheckCircle2, Clock, Mail, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/misc";
import { cancelBooking, completeBooking } from "@/lib/actions/booking";
import type { BookingWithClient } from "@/lib/data/booking";
import type { BookingStatus } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

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
  const [cancelId, setCancelId] = useState<string | null>(null);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: BookingWithClient[] = [];
    const pa: BookingWithClient[] = [];
    for (const b of bookings) {
      if (b.status === "confirmed" && new Date(b.scheduled_at).getTime() >= now) {
        up.push(b);
      } else {
        pa.push(b);
      }
    }
    up.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)); // soonest first
    return { upcoming: up, past: pa };
  }, [bookings]);

  async function complete(id: string) {
    setBusyId(id);
    const res = await completeBooking(id);
    setBusyId(null);
    if ("error" in res) return toast(res.error, "error");
    toast("Marked completed");
    router.refresh();
  }

  async function doCancel() {
    if (!cancelId) return;
    const id = cancelId;
    setCancelId(null);
    setBusyId(id);
    const res = await cancelBooking(id);
    setBusyId(null);
    if ("error" in res) return toast(res.error, "error");
    toast("Booking cancelled");
    router.refresh();
  }

  function Row({ b, actions }: { b: BookingWithClient; actions: boolean }) {
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
              <Link
                href={`/clients/${b.client.id}`}
                className="text-xs text-primary hover:underline"
              >
                {b.client.name}
              </Link>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {fmt(b.scheduled_at)} · {b.duration_minutes} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {b.guest_email}
            </span>
          </div>
          {b.notes && (
            <p className="mt-1 text-xs text-muted-foreground">“{b.notes}”</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => complete(b.id)}
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
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No upcoming bookings"
            description="When someone books a call through your link, it shows up here."
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {upcoming.map((b) => (
                <Row key={b.id} b={b} actions />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Past &amp; cancelled
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {past.map((b) => (
                <Row key={b.id} b={b} actions={false} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={doCancel}
        destructive
        title="Cancel this booking?"
        description="The time slot will reopen for others to book. This can't be undone."
        confirmLabel="Cancel booking"
      />
    </div>
  );
}
