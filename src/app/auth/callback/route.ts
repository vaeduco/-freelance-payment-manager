import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from a Supabase confirmation / magic link email.
 * Exchanges the `code` for a session cookie, then forwards to the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Only follow same-origin relative paths (prevents an open redirect).
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Tailor the failure message: a bad recovery link isn't an email-verify issue.
  const message =
    next === "/reset-password"
      ? "This password reset link is invalid or has expired. Please request a new one."
      : "Could not verify your email. Please try signing in.";
  const dest = next === "/reset-password" ? "/forgot-password" : "/login";
  return NextResponse.redirect(
    `${origin}${dest}?error=${encodeURIComponent(message)}`,
  );
}
