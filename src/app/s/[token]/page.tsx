import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSharedInvoice } from "@/components/invoices/public-shared-invoice";

export const metadata: Metadata = { title: "Invoice" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SharedInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();
  return <PublicSharedInvoice token={token} />;
}
