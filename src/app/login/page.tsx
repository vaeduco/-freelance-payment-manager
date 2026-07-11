import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell
      heading="Welcome back"
      subheading="Sign in to manage your invoices and income."
    >
      <AuthForm
        mode="login"
        redirectedFrom={params.redirectedFrom}
        initialError={params.error}
      />
    </AuthShell>
  );
}
