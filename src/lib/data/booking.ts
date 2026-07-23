import { createClient } from "@/lib/supabase/server";
import type { Availability, Booking } from "@/lib/types";

export type BookingWithClient = Booking & {
  client: { id: string; name: string } | null;
};

/** All of the current user's bookings (with linked client), newest-scheduled first. */
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
    .order("scheduled_at", { ascending: false });

  return (data ?? []) as unknown as BookingWithClient[];
}

/** The current user's weekly availability rules (ordered day, then start time). */
export async function getAvailability(): Promise<Availability[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", user.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  return (data ?? []) as Availability[];
}
