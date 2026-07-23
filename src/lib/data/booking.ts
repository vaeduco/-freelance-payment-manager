import { createClient } from "@/lib/supabase/server";
import type { Availability } from "@/lib/types";

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
