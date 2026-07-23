"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { saveAvailability, saveBookingSettings } from "@/lib/actions/booking";
import { WEEKDAYS, type Availability, type Profile } from "@/lib/types";

interface Rule {
  day_of_week: number;
  start_time: string; // "HH:MM"
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

const SLOT_OPTIONS = [15, 30, 45, 60, 90];
const hhmm = (t: string) => t.slice(0, 5); // "09:00:00" -> "09:00"

function timezoneList(current: string): string[] {
  let zones: string[] = [];
  try {
    // Available in modern browsers/Node; guarded for older runtimes.
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    if (typeof sv === "function") zones = sv("timeZone");
  } catch {
    /* ignore */
  }
  if (zones.length === 0) {
    zones = [
      "UTC",
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "Europe/London",
      "Europe/Berlin",
      "Asia/Manila",
      "Asia/Singapore",
      "Asia/Kolkata",
      "Australia/Sydney",
    ];
  }
  // Ensure the currently-saved zone is selectable even if not in the list.
  if (current && !zones.includes(current)) zones = [current, ...zones];
  return zones;
}

export function SchedulingClient({
  profile,
  availability,
}: {
  profile: Profile | null;
  availability: Availability[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const [slug, setSlug] = useState(profile?.booking_slug ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone || browserTz);
  const [savingLink, setSavingLink] = useState(false);

  const [rules, setRules] = useState<Rule[]>(
    availability.map((a) => ({
      day_of_week: a.day_of_week,
      start_time: hhmm(a.start_time),
      end_time: hhmm(a.end_time),
      slot_duration_minutes: a.slot_duration_minutes,
      is_active: a.is_active,
    })),
  );
  const [savingRules, setSavingRules] = useState(false);

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const zones = useMemo(() => timezoneList(profile?.timezone ?? ""), [profile?.timezone]);

  const publicUrl = slug ? `${origin}/book/${slug}` : "";

  function addRule() {
    setRules((prev) => [
      ...prev,
      {
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        slot_duration_minutes: 30,
        is_active: true,
      },
    ]);
  }
  function updateRule(i: number, patch: Partial<Rule>) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function saveLink() {
    setSavingLink(true);
    const res = await saveBookingSettings(slug, timezone);
    setSavingLink(false);
    if ("error" in res) return toast(res.error, "error");
    toast("Booking link saved");
    router.refresh();
  }

  async function saveRules() {
    for (const r of rules) {
      if (r.end_time <= r.start_time) {
        return toast("Each range's end time must be after its start time.", "error");
      }
    }
    setSavingRules(true);
    const res = await saveAvailability(rules);
    setSavingRules(false);
    if ("error" in res) return toast(res.error, "error");
    toast("Availability saved");
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
    <div className="space-y-6">
      {/* Public link + timezone */}
      <Card>
        <CardHeader>
          <CardTitle>Your booking page</CardTitle>
          <CardDescription>
            Pick a public link and your timezone. Clients book you at{" "}
            <span className="font-medium text-foreground">/book/your-link</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sc-slug">Public link</Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
              <span className="flex items-center whitespace-nowrap bg-secondary px-3 text-sm text-muted-foreground">
                {(origin || "…").replace(/^https?:\/\//, "")}/book/
              </span>
              <input
                id="sc-slug"
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

          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="sc-tz">Your timezone</Label>
            <Select
              id="sc-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Availability is set in this timezone; guests see slots converted to
              theirs.
            </p>
          </div>

          <div>
            <Button size="sm" onClick={saveLink} loading={savingLink}>
              Save booking page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly availability */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly availability</CardTitle>
          <CardDescription>
            Add the time ranges you&apos;re open for calls. Slots are generated
            automatically and already-booked times are hidden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No availability yet. Add a range to open your booking page.
            </p>
          )}

          {rules.map((r, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"
            >
              <Select
                aria-label="Day of week"
                value={r.day_of_week}
                onChange={(e) => updateRule(i, { day_of_week: Number(e.target.value) })}
                className="w-32"
              >
                {WEEKDAYS.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {d}
                  </option>
                ))}
              </Select>
              <input
                type="time"
                aria-label="Start time"
                value={r.start_time}
                onChange={(e) => updateRule(i, { start_time: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="time"
                aria-label="End time"
                value={r.end_time}
                onChange={(e) => updateRule(i, { end_time: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm"
              />
              <Select
                aria-label="Slot length"
                value={r.slot_duration_minutes}
                onChange={(e) =>
                  updateRule(i, { slot_duration_minutes: Number(e.target.value) })
                }
                className="w-28"
              >
                {SLOT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={r.is_active}
                  onChange={(e) => updateRule(i, { is_active: e.currentTarget.checked })}
                />
                Active
              </label>
              <button
                type="button"
                onClick={() => removeRule(i)}
                aria-label="Remove range"
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="h-4 w-4" />
              Add range
            </Button>
            <Button size="sm" onClick={saveRules} loading={savingRules}>
              Save availability
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
