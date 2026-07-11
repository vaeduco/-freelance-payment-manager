import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the currently authenticated user. Routes are already protected by
 * middleware, but server actions/queries call this to get the user id and to
 * fail safely if a session is somehow missing.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
