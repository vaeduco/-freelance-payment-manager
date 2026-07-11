import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      heading="Create your account"
      subheading="Start tracking payments in under a minute."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
