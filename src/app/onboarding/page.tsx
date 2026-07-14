import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { getLogoSignedUrl } from "@/lib/data/storage";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (profile?.onboarded_at) redirect("/dashboard");

  const logoUrl = await getLogoSignedUrl(profile?.logo_path);

  return (
    <OnboardingClient
      initialBusinessName={profile?.business_name ?? ""}
      initialCurrency={profile?.currency ?? "USD"}
      initialTermsDays={profile?.payment_terms_days ?? 14}
      logoUrl={logoUrl}
    />
  );
}
