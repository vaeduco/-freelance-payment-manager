import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { ComingSoon } from "@/components/settings/coming-soon";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsSettingsPage() {
  return (
    <ComingSoon
      title="Integrations"
      description="Connect FreelanceFlow to the other tools you use."
      icon={Plug}
    />
  );
}
