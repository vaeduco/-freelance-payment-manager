import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { AvailabilityClient } from "@/components/booking/availability-client";
import { getProfile } from "@/lib/data/profile";
import { getAvailableDates } from "@/lib/data/booking";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const [profile, dates] = await Promise.all([getProfile(), getAvailableDates()]);
  return (
    <div>
      <PageHeader
        title="Availability"
        description="Mark the dates you're open for calls and set your public booking link."
      />
      <AvailabilityClient profile={profile} initialDates={dates} />
    </div>
  );
}
