import type { Metadata } from "next";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { getClients } from "@/lib/data/clients";
import { getProfile } from "@/lib/data/profile";
import { InvoicesClient } from "@/components/invoices/invoices-client";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const [invoices, clients, profile] = await Promise.all([
    getInvoicesWithClients(),
    getClients(),
    getProfile(),
  ]);

  return (
    <InvoicesClient
      invoices={invoices}
      clients={clients}
      currency={profile?.currency ?? "USD"}
    />
  );
}
