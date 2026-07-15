import type { Metadata } from "next";
import { Paintbrush } from "lucide-react";
import { ComingSoon } from "@/components/settings/coming-soon";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearanceSettingsPage() {
  return (
    <ComingSoon
      title="Appearance"
      description="Personalize the look and feel. (Theme toggle lives in the sidebar for now.)"
      icon={Paintbrush}
    />
  );
}
