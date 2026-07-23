"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { BookingStatus } from "@/lib/types";

type ActionResult = { ok: true } | { error: string };

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/; // 3–50 chars, no edge hyphen
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidTimezone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Toggle a single date in the caller's availability (mark / unmark). */
export async function toggleAvailableDate(
  date: string,
): Promise<{ ok: true; active: boolean } | { error: string }> {
  try {
    const user = await requireUser();
    if (!DATE_RE.test(date)) return { error: "Invalid date." };
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("available_dates")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("available_dates")
        .delete()
        .eq("id", existing.id);
      if (error) return { error: error.message };
      revalidatePath("/availability");
      return { ok: true, active: false };
    }

    const { error } = await supabase
      .from("available_dates")
      .insert({ user_id: user.id, date });
    // A concurrent insert (unique violation) just means it's now marked.
    if (error && error.code !== "23505") return { error: error.message };
    revalidatePath("/availability");
    return { ok: true, active: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Save the public booking handle + timezone on the profile. */
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
    revalidatePath("/availability");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Update a booking's status (RLS scopes it to the owner). Emails: a follow-up. */
async function setBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/bookings");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function confirmBooking(id: string): Promise<ActionResult> {
  return setBookingStatus(id, "confirmed");
}
export async function declineBooking(id: string): Promise<ActionResult> {
  return setBookingStatus(id, "declined");
}
export async function cancelBooking(id: string): Promise<ActionResult> {
  return setBookingStatus(id, "cancelled");
}
export async function completeBooking(id: string): Promise<ActionResult> {
  return setBookingStatus(id, "completed");
}
