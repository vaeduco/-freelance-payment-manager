import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Two-factor authentication" };

export default async function MfaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AuthShell
      heading="Two-factor authentication"
      subheading="Enter the code from your authenticator app to finish signing in."
    >
      <MfaChallengeForm />
    </AuthShell>
  );
}
