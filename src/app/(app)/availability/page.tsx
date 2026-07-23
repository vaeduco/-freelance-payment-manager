import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { AvailabilityClient } from "@/components/booking/availability-client";
import { getProfile } from "@/lib/data/profile";
import { getAvailableDates, getBookings } from "@/lib/data/booking";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const [profile, dates, bookings] = await Promise.all([
    getProfile(),
    getAvailableDates(),
    getBookings(),
  ]);

  // pending+confirmed booking count per marked date, for the calendar badges.
  const counts: Record<string, number> = {};
  for (const b of bookings) {
    if (b.status === "pending" || b.status === "confirmed") {
      counts[b.requested_date] = (counts[b.requested_date] ?? 0) + 1;
    }
  }

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Mark the dates you're open for calls and set your public booking link."
      />
      <AvailabilityClient
        profile={profile}
        initialDates={dates}
        counts={counts}
        maxPerDay={profile?.max_bookings_per_day ?? 1}
      />
    </div>
  );
}
