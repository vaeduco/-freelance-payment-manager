import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SchedulingClient } from "@/components/settings/scheduling-client";
import { getProfile } from "@/lib/data/profile";
import { getAvailability } from "@/lib/data/booking";

export const metadata: Metadata = { title: "Scheduling" };

export default async function SchedulingSettingsPage() {
  const [profile, availability] = await Promise.all([
    getProfile(),
    getAvailability(),
  ]);

  return (
    <div>
      <PageHeader
        title="Scheduling"
        description="Set your weekly availability and public booking link."
      />
      <SchedulingClient profile={profile} availability={availability} />
    </div>
  );
}
