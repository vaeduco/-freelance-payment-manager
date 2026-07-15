import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/settings/coming-soon";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsSettingsPage() {
  return (
    <ComingSoon
      title="Notifications"
      description="Choose which emails and in-app alerts you receive."
      icon={Bell}
    />
  );
}
