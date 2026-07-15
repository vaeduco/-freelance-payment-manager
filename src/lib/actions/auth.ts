"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logEvent, requestContext } from "@/lib/security/log";

type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { error: string };

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };

    // Record the sign-in for Login History; raise an alert on a new device.
    if (data.user) {
      const ctx = await requestContext();
      let newDevice = false;
      if (ctx.device) {
        const { data: seen } = await supabase
          .from("security_events")
          .select("id")
          .eq("category", "auth")
          .eq("device", ctx.device)
          .limit(1);
        newDevice = (seen?.length ?? 0) === 0;
      }
      await logEvent(supabase, data.user.id, {
        category: "auth",
        action: "login",
        summary: newDevice
          ? `New device signed in${ctx.device ? `: ${ctx.device}` : ""}`
          : `Signed in${ctx.device ? ` from ${ctx.device}` : ""}`,
        isAlert: newDevice,
        ip: ctx.ip,
        location: ctx.location,
        device: ctx.device,
        userAgent: ctx.userAgent,
      });
    }
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const origin = await siteOrigin();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };

    // If the project requires email confirmation, there's a user but no session.
    const needsConfirmation = !data.session;
    return { ok: true, needsConfirmation };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Send a password-reset email. The link routes through /auth/callback, which
 * establishes a recovery session and forwards to /reset-password.
 * We intentionally return { ok: true } for missing accounts too (no user
 * enumeration); only genuine errors (e.g. rate limiting) surface.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const origin = await siteOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    if (error && /rate|too many/i.test(error.message)) {
      return { error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Set a new password for the currently-authenticated (recovery) session.
 * The recovery session cookies are set by /auth/callback before the user
 * reaches /reset-password, and are readable/writable from this server action.
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) return { error: error.message };
    if (data.user) {
      await logEvent(supabase, data.user.id, {
        category: "security",
        action: "password.change",
        summary: "Password changed",
        isAlert: true,
      });
    }
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
