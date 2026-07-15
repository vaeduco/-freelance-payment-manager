import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsClient } from "@/components/settings/settings-client";
import { Card } from "@/components/ui/card";
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

      <Link href="/settings/security" className="mb-6 block max-w-2xl">
        <Card className="flex items-center gap-4 p-5 transition-colors hover:bg-secondary/40">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Security Center</p>
            <p className="text-sm text-muted-foreground">
              Two-factor authentication, password, devices, and activity.
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Card>
      </Link>

      <SettingsClient
        profile={profile}
        email={user?.email ?? ""}
        logoUrl={logoUrl}
      />
    </div>
  );
}
