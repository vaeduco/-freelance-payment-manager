import type { Metadata } from "next";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { getClients } from "@/lib/data/clients";
import { getProfile } from "@/lib/data/profile";
import { getPaymentMethods } from "@/lib/data/payment-methods";
import { hourlyRatesByProjectType } from "@/lib/utils";
import { InvoicesClient } from "@/components/invoices/invoices-client";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const [invoices, clients, profile, paymentMethods] = await Promise.all([
    getInvoicesWithClients(),
    getClients(),
    getProfile(),
    getPaymentMethods(),
  ]);

  return (
    <InvoicesClient
      invoices={invoices}
      clients={clients}
      currency={profile?.currency ?? "USD"}
      paymentMethods={paymentMethods}
      projectTypeRates={hourlyRatesByProjectType(invoices)}
      paymentTermsDays={profile?.payment_terms_days ?? 14}
    />
  );
}
