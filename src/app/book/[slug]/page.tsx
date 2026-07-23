import type { Metadata } from "next";
import { PublicBooking } from "@/components/booking/public-booking";

export const metadata: Metadata = { title: "Book a call" };

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 py-10 sm:py-16">
      <PublicBooking slug={slug} />
    </main>
  );
}
