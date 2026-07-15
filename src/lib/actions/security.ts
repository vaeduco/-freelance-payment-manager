"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

/**
 * Proxy for the Have I Been Pwned "range" (k-anonymity) API. The client hashes
 * the password with SHA-1 locally and sends ONLY the first 5 hex chars here; we
 * fetch the matching hash-suffix list and hand it back for the client to match.
 * The password itself never leaves the browser. Server-side avoids CORS/ad-block
 * issues and keeps our origin out of the client's request logs to a third party.
 */
export async function pwnedRange(prefix: string): Promise<string> {
  if (!/^[0-9A-Fa-f]{5}$/.test(prefix)) return "";
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

/** Record that the user's password was checked against HIBP and came back clean. */
export async function markPasswordChecked(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, password_checked_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw error;
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Sign out every OTHER device/session, keeping the current one. */
export async function signOutOtherDevices(): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) throw error;
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
