"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { MonthCalendar } from "@/components/booking/month-calendar";
import { Minus, Plus } from "lucide-react";
import {
  saveBookingSettings,
  saveMaxBookingsPerDay,
  toggleAvailableDate,
} from "@/lib/actions/booking";
import type { Profile } from "@/lib/types";

function timezoneList(current: string): string[] {
  let zones: string[] = [];
  try {
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    if (typeof sv === "function") zones = sv("timeZone");
  } catch {
    /* ignore */
  }
  if (zones.length === 0) {
    zones = ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Manila"];
  }
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones;
}

export function AvailabilityClient({
  profile,
  initialDates,
  counts,
  maxPerDay,
}: {
  profile: Profile | null;
  initialDates: string[];
  /** pending+confirmed booking count per date (YYYY-MM-DD). */
  counts: Record<string, number>;
  maxPerDay: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [cap, setCap] = useState(maxPerDay);

  async function changeCap(next: number) {
    if (next < 1 || next > 50) return;
    const prev = cap;
    setCap(next); // optimistic
    const res = await saveMaxBookingsPerDay(next);
    if ("error" in res) {
      setCap(prev);
      toast(res.error, "error");
    } else {
      toast("Daily limit updated");
    }
  }

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const [marked, setMarked] = useState<Set<string>>(new Set(initialDates));
  const [slug, setSlug] = useState(profile?.booking_slug ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone || browserTz);
  const [savingLink, setSavingLink] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  const zones = useMemo(() => timezoneList(profile?.timezone ?? ""), [profile?.timezone]);
  const publicUrl = slug ? `${origin}/book/${slug}` : "";

  async function toggle(date: string) {
    const wasMarked = marked.has(date);
    // optimistic
    setMarked((prev) => {
      const n = new Set(prev);
      if (wasMarked) n.delete(date);
      else n.add(date);
      return n;
    });
    const res = await toggleAvailableDate(date);
    if ("error" in res) {
      toast(res.error, "error");
      setMarked((prev) => {
        const n = new Set(prev);
        if (wasMarked) n.add(date);
        else n.delete(date);
        return n;
      });
    }
  }

  async function saveLink() {
    setSavingLink(true);
    const res = await saveBookingSettings(slug, timezone);
    setSavingLink(false);
    if ("error" in res) return toast(res.error, "error");
    toast("Booking page saved");
    router.refresh();
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't copy the link", "error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Public link + timezone */}
      <Card>
        <CardHeader>
          <CardTitle>Your booking page</CardTitle>
          <CardDescription>
            Pick a public link and your timezone. Clients request calls at{" "}
            <span className="font-medium text-foreground">/book/your-link</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="av-slug">Public link</Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
              <span className="flex items-center whitespace-nowrap bg-secondary px-3 text-sm text-muted-foreground">
                {(origin || "…").replace(/^https?:\/\//, "")}/book/
              </span>
              <input
                id="av-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="your-name"
                autoComplete="off"
                className="min-w-0 flex-1 bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3–50 lowercase letters, numbers, and hyphens. Leave blank to disable
              your public page.
            </p>
          </div>

          {publicUrl && (
            <div className="flex items-center gap-2">
              <Input readOnly value={publicUrl} className="min-w-0 flex-1 text-xs" />
              <Button variant="outline" size="sm" onClick={copyUrl} className="shrink-0">
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="av-tz">Your timezone</Label>
            <Select id="av-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Guests pick times in this timezone — it&apos;s shown clearly on your
              booking page.
            </p>
          </div>

          <Button size="sm" onClick={saveLink} loading={savingLink}>
            Save booking page
          </Button>
        </CardContent>
      </Card>

      {/* Available dates */}
      <Card>
        <CardHeader>
          <CardTitle>Available dates</CardTitle>
          <CardDescription>
            Tap dates to mark yourself open. Guests can only request calls on
            marked dates. ({marked.size} marked)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Max bookings per day</p>
              <p className="text-xs text-muted-foreground">
                Applies to every available date.
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeCap(cap - 1)}
                disabled={cap <= 1}
                aria-label="Decrease"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={cap}
                onChange={(e) => {
                  const v = parseInt(e.target.value || "0", 10);
                  if (!Number.isNaN(v)) changeCap(Math.min(50, Math.max(1, v)));
                }}
                aria-label="Max bookings per day"
                className="h-8 w-12 rounded-md border border-input bg-background text-center text-sm tabular-nums"
              />
              <button
                type="button"
                onClick={() => changeCap(cap + 1)}
                disabled={cap >= 50}
                aria-label="Increase"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <MonthCalendar
            marked={marked}
            onSelect={toggle}
            dayInfo={(ds) => (marked.has(ds) ? { count: counts[ds] ?? 0, cap } : null)}
          />

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-success/40" /> Open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-warning/40" /> Partially booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-destructive/40" /> Full
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
