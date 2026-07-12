import type { Metadata } from "next";
import { ReportsClient } from "@/components/reports/reports-client";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { getPaymentsWithRelations } from "@/lib/data/payments";
import { getProfile } from "@/lib/data/profile";
import { deriveInvoiceNumbers } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [invoices, payments, profile] = await Promise.all([
    getInvoicesWithClients(),
    getPaymentsWithRelations(),
    getProfile(),
  ]);

  return (
    <ReportsClient
      invoices={invoices}
      payments={payments}
      currency={profile?.currency ?? "USD"}
      invoiceNumbers={deriveInvoiceNumbers(invoices)}
    />
  );
}
