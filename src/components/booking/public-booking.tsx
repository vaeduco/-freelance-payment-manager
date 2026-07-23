"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Clock, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

interface Slot {
  start: string; // ISO UTC
  duration: number;
}

type Phase = "loading" | "notfound" | "ready" | "booked" | "error";

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function PublicBooking({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), []);
  const guestTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "your timezone";
    } catch {
      return "your timezone";
    }
  }, []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [displayName, setDisplayName] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  async function loadSlots() {
    const today = new Date();
    const to = new Date(today.getTime() + 30 * 86_400_000);
    const { data } = await supabase.rpc("get_available_slots", {
      p_slug: slug,
      p_from: dateKey(today),
      p_to: dateKey(to),
    });
    setSlots((data?.slots ?? []) as Slot[]);
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_booking_page", { p_slug: slug });
      if (error || !data?.found) {
        setPhase("notfound");
        return;
      }
      setDisplayName(data.display_name as string);
      await loadSlots();
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Group available slots by the guest's local calendar day.
  const days = useMemo(() => {
    const map = new Map<string, { label: string; slots: Slot[] }>();
    for (const s of slots) {
      const d = new Date(s.start);
      const key = dateKey(d);
      if (!map.has(key)) {
        map.set(key, {
          label: d.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          slots: [],
        });
      }
      map.get(key)!.slots.push(s);
    }
    return [...map.entries()].map(([key, v]) => ({ key, ...v }));
  }, [slots]);

  // If a re-fetch (e.g. after a slot was taken) drops the selected day, reset so
  // the grid falls back to the first day with availability instead of blank.
  useEffect(() => {
    if (selectedDay && !days.some((d) => d.key === selectedDay)) {
      setSelectedDay(null);
    }
  }, [days, selectedDay]);

  const activeDay = selectedDay ?? days[0]?.key ?? null;
  const daySlots = days.find((d) => d.key === activeDay)?.slots ?? [];

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtFull = (iso: string) =>
    new Date(iso).toLocaleString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  async function submit() {
    if (!selectedSlot) return;
    setFormError(null);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_booking", {
      p_slug: slug,
      p_guest_name: name,
      p_guest_email: email,
      p_scheduled_at: selectedSlot.start,
      p_notes: notes,
    });
    setSubmitting(false);

    if (error) {
      setFormError("Something went wrong. Please try again.");
      return;
    }
    const status = data?.status as string;
    if (status === "ok") {
      setConfirmedAt(selectedSlot.start);
      setPhase("booked");
      return;
    }
    if (status === "taken") {
      setFormError("Sorry, that time was just booked. Please pick another.");
      setSelectedSlot(null);
      await loadSlots();
      return;
    }
    if (status === "bad_input") {
      setFormError((data?.message as string) ?? "Please check your details.");
      return;
    }
    setFormError("That time is no longer available. Please pick another.");
    setSelectedSlot(null);
    await loadSlots();
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (phase === "notfound") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg font-semibold">Booking page not found</p>
          <p className="text-sm text-muted-foreground">
            This link may be inactive or incorrect.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "booked" && confirmedAt) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold">You&apos;re booked!</p>
          <p className="text-sm text-muted-foreground">
            Your call with {displayName} is confirmed for
          </p>
          <p className="font-medium text-foreground">{fmtFull(confirmedAt)}</p>
          <p className="text-xs text-muted-foreground">Times shown in {guestTz}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(displayName) || "•"}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Book a call with {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a time — shown in {guestTz}.
          </p>
        </div>
      </div>

      {days.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No available times right now. Please check back later.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Day picker */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  setSelectedDay(d.key);
                  setSelectedSlot(null);
                }}
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  d.key === activeDay
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Slots for the active day */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {daySlots.map((s) => (
              <button
                key={s.start}
                type="button"
                onClick={() => {
                  setSelectedSlot(s);
                  setFormError(null);
                }}
                className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                  selectedSlot?.start === s.start
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {fmtTime(s.start)}
              </button>
            ))}
          </div>

          {/* Booking form (revealed once a slot is chosen) */}
          {selectedSlot && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm">
                  Booking{" "}
                  <span className="font-semibold text-foreground">
                    {fmtFull(selectedSlot.start)}
                  </span>{" "}
                  ({selectedSlot.duration} min)
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-name">Your name</Label>
                  <Input
                    id="bk-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-email">Email</Label>
                  <Input
                    id="bk-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-notes">Notes (optional)</Label>
                  <Textarea
                    id="bk-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anything you'd like to cover?"
                  />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button onClick={submit} loading={submitting} className="w-full">
                  Confirm booking
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
