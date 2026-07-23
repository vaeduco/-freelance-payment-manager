import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { BookingsClient } from "@/components/bookings/bookings-client";
import { getBookings } from "@/lib/data/booking";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage() {
  const [bookings, profile] = await Promise.all([getBookings(), getProfile()]);
  const timezone = profile?.timezone || "UTC";

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Calls booked through your public link."
      >
        <Link
          href="/availability"
          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Manage availability
        </Link>
      </PageHeader>
      <BookingsClient bookings={bookings} timezone={timezone} />
    </div>
  );
}
