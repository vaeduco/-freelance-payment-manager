import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Fetch the current user's profile (tax rate, currency, etc.).
 * A DB trigger creates the row on signup; this includes a safety-net
 * upsert for users created before the trigger existed.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (data) return data as Profile;

  // Safety net: create the profile if it doesn't exist yet.
  await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  const { data: created } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (created as Profile) ?? null;
}
