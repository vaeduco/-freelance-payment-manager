import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { getLogoSignedUrl } from "@/lib/data/storage";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();
  const logoUrl = await getLogoSignedUrl(profile?.logo_path);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile and preferences."
      />
      <SettingsClient
        profile={profile}
        email={user?.email ?? ""}
        logoUrl={logoUrl}
      />
    </div>
  );
}
