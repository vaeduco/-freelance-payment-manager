"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

export interface AvailabilityInput {
  day_of_week: number;
  start_time: string; // "HH:MM"
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/; // 3–50 chars, no edge hyphen

function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Replace the user's entire weekly availability with the given rules. Validates
 * each rule (day 0–6, valid HH:MM, end > start, sane slot length), then wipes
 * and re-inserts under RLS (only the caller's own rows are ever touched).
 */
export async function saveAvailability(
  rules: AvailabilityInput[],
): Promise<ActionResult> {
  try {
    await requireUser(); // guard: throws if no session (RPC also checks auth.uid())
    const supabase = await createClient();

    if (rules.length > 100) return { error: "Too many availability ranges." };

    const clean = [];
    for (const r of rules) {
      if (!Number.isInteger(r.day_of_week) || r.day_of_week < 0 || r.day_of_week > 6)
        return { error: "Invalid day of week." };
      if (!TIME_RE.test(r.start_time) || !TIME_RE.test(r.end_time))
        return { error: "Times must be in HH:MM format." };
      if (toMinutes(r.end_time) <= toMinutes(r.start_time))
        return { error: "End time must be after start time." };
      const slot = Number(r.slot_duration_minutes);
      if (!Number.isInteger(slot) || slot < 5 || slot > 480)
        return { error: "Slot length must be between 5 and 480 minutes." };
      clean.push({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        slot_duration_minutes: slot,
        is_active: Boolean(r.is_active),
      });
    }

    // Atomic replace via RPC: delete + insert run in one transaction, so a
    // failed insert can never leave the user with an empty schedule.
    const { error } = await supabase.rpc("replace_availability", {
      p_rules: clean,
    });
    if (error) return { error: error.message };

    revalidatePath("/settings/scheduling");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Set a booking's status (cancel / mark completed). RLS scopes it to the owner. */
async function setBookingStatus(
  id: string,
  status: "cancelled" | "completed",
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/bookings");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelBooking(id: string): Promise<ActionResult> {
  return setBookingStatus(id, "cancelled");
}
export async function completeBooking(id: string): Promise<ActionResult> {
  return setBookingStatus(id, "completed");
}

/**
 * Save the public booking handle + timezone on the profile. The slug is
 * normalized + format-checked; a taken slug surfaces a friendly error via the
 * partial-unique index. An empty slug clears the public link.
 */
export async function saveBookingSettings(
  rawSlug: string,
  timezone: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const slug = rawSlug.trim().toLowerCase();
    if (slug && !SLUG_RE.test(slug))
      return {
        error:
          "Link can use 3–50 lowercase letters, numbers, and hyphens (not at the ends).",
      };
    if (!isValidTimezone(timezone)) return { error: "Please pick a valid timezone." };

    const { error } = await supabase
      .from("profiles")
      .update({ booking_slug: slug || null, timezone })
      .eq("id", user.id);

    if (error) {
      if (error.code === "23505")
        return { error: "That booking link is already taken — try another." };
      return { error: error.message };
    }

    revalidatePath("/settings/scheduling");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
