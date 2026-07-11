"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
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
