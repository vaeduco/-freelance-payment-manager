import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // The recovery link routes through /auth/callback, which establishes a
  // session before landing here. If there's no session, the link was invalid
  // or expired — show a recovery path instead of a dead form.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        heading="Link expired"
        subheading="This password reset link is invalid or has expired."
      >
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Request a new reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heading="Set a new password"
      subheading="Choose a new password for your account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
