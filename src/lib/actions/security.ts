"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/security/log";

type ActionResult = { ok: true } | { error: string };

/** Record a security-category activity event (used by client-driven flows like 2FA). */
export async function logSecurityActivity(
  action: string,
  summary: string,
  isAlert = true,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await logEvent(supabase, user.id, {
      category: "security",
      action,
      summary,
      isAlert,
    });
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

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

/** Record a data/report export in the activity log (also raised as an alert). */
export async function logReportExport(kind: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await logEvent(supabase, user.id, {
      category: "report",
      action: "report.export",
      summary: `Exported ${kind}`,
      isAlert: true,
    });
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Mark all of the user's unread security alerts as read. */
export async function markAllAlertsRead(): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("security_events")
      .update({ read_at: new Date().toISOString() })
      .eq("is_alert", true)
      .is("read_at", null);
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
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) throw error;
    await logEvent(supabase, user.id, {
      category: "security",
      action: "signout_others",
      summary: "Signed out all other devices",
      isAlert: true,
    });
    revalidatePath("/settings/security");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
