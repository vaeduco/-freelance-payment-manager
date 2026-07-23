"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MonthCalendar } from "@/components/booking/month-calendar";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";

type Phase = "loading" | "notfound" | "ready" | "submitted" | "error";

function prettyDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PublicBooking({ slug }: { slug: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [displayName, setDisplayName] = useState("");
  const [tz, setTz] = useState("UTC");
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_booking_page", { p_slug: slug });
      if (error || !data?.found) {
        setPhase("notfound");
        return;
      }
      setDisplayName(data.display_name as string);
      setTz((data.timezone as string) || "UTC");
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dk = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      // Fetch the full window the server will serve (get_available_dates clamps
      // to 366 days), so every selectable date the calendar can reach is loaded.
      const to = new Date(today.getTime() + 366 * 86_400_000);
      const { data: dd } = await supabase.rpc("get_available_dates", {
        p_slug: slug,
        p_from: dk(today),
        p_to: dk(to),
      });
      setDates(new Set((dd?.dates ?? []) as string[]));
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function submit() {
    if (!selectedDate) return;
    setFormError(null);
    if (endTime <= startTime) {
      setFormError("End time must be after the start time.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_booking", {
      p_slug: slug,
      p_guest_name: name,
      p_guest_email: email,
      p_requested_date: selectedDate,
      p_start: startTime,
      p_end: endTime,
      p_notes: notes,
    });
    setSubmitting(false);
    if (error) {
      setFormError("Something went wrong. Please try again.");
      return;
    }
    const status = data?.status as string;
    if (status === "ok") {
      setPhase("submitted");
      return;
    }
    if (status === "bad_input") {
      setFormError((data?.message as string) ?? "Please check your details.");
      return;
    }
    if (status === "date_unavailable") {
      setFormError("That date isn't available anymore. Please pick another.");
      setSelectedDate(null);
      return;
    }
    setFormError("That request isn't valid. Please try a different date or time.");
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

  if (phase === "submitted") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Check className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold">Request sent!</p>
          <p className="text-sm text-muted-foreground">
            Your call request with {displayName} for
          </p>
          <p className="font-medium text-foreground">
            {selectedDate && prettyDate(selectedDate)} · {startTime}–{endTime}
          </p>
          <p className="text-xs text-muted-foreground">
            Times are in {tz}. You&apos;ll hear back once {displayName} confirms.
          </p>
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
            Request a call with {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick an available date — all times are in {tz}.
          </p>
        </div>
      </div>

      {dates.size === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No available dates right now. Please check back later.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <MonthCalendar
              marked={dates}
              isDisabled={(d) => !dates.has(d)}
              selectedDate={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                setFormError(null);
              }}
            />

            {selectedDate && (
              <div className="space-y-4 border-t border-border pt-5">
                <p className="text-sm font-medium">{prettyDate(selectedDate)}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-start">Start ({tz})</Label>
                    <input
                      id="bk-start"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-end">End ({tz})</Label>
                    <input
                      id="bk-end"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-name">Your name</Label>
                  <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-email">Email</Label>
                  <Input id="bk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
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
                  Request this time
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
