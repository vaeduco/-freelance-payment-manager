import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { AppearanceClient } from "@/components/settings/appearance-client";
import { getUserSettings } from "@/lib/data/user-settings";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearanceSettingsPage() {
  const settings = await getUserSettings();
  return (
    <div>
      <PageHeader
        title="Appearance"
        description="Personalize the theme, layout, and formatting preferences."
      />
      <AppearanceClient initial={settings} />
    </div>
  );
}
