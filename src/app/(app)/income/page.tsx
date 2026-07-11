import type { Metadata } from "next";
import { IncomeClient } from "@/components/income/income-client";
import { getPaymentsWithRelations } from "@/lib/data/payments";
import { getClients } from "@/lib/data/clients";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { getProfile } from "@/lib/data/profile";
import type { Invoice } from "@/lib/types";

export const metadata: Metadata = {
  title: "Income",
};

export default async function IncomePage() {
  const [payments, clients, invoices, profile] = await Promise.all([
    getPaymentsWithRelations(),
    getClients(),
    getInvoicesWithClients(),
    getProfile(),
  ]);

  const currency = profile?.currency ?? "USD";

  return (
    <IncomeClient
      payments={payments}
      clients={clients}
      invoices={invoices as Invoice[]}
      currency={currency}
    />
  );
}
