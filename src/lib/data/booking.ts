import { createClient } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

export type BookingWithClient = Booking & {
  client: { id: string; name: string } | null;
};

/** The current user's marked available dates (YYYY-MM-DD strings, ascending). */
export async function getAvailableDates(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Only today-onward: past marked dates can't be unmarked (the calendar
  // disables past days) and would inflate the count.
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("available_dates")
    .select("date")
    .eq("user_id", user.id)
    .gte("date", today)
    .order("date", { ascending: true });

  return (data ?? []).map((r) => r.date as string);
}

/** All of the current user's booking requests (with linked client), newest first. */
export async function getBookings(): Promise<BookingWithClient[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("bookings")
    .select("*, client:clients(id, name)")
    .eq("user_id", user.id)
    .order("requested_start_at", { ascending: false });

  return (data ?? []) as unknown as BookingWithClient[];
}
