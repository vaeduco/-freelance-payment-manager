import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/clients/client-detail";
import { getClient, getClientHistory, getClients } from "@/lib/data/clients";
import { getProfile } from "@/lib/data/profile";
import { getPaymentMethods } from "@/lib/data/payment-methods";
import { getInvoicesWithClients } from "@/lib/data/invoices";
import { hourlyRatesByProjectType } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Client",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, history, profile, clients, paymentMethods, allInvoices] =
    await Promise.all([
      getClient(id),
      getClientHistory(id),
      getProfile(),
      getClients(),
      getPaymentMethods(),
      getInvoicesWithClients(),
    ]);

  if (!client) notFound();

  const currency = profile?.currency ?? "USD";

  return (
    <ClientDetail
      client={client}
      invoices={history.invoices}
      payments={history.payments}
      currency={currency}
      clients={clients}
      paymentMethods={paymentMethods}
      projectTypeRates={hourlyRatesByProjectType(allInvoices)}
      paymentTermsDays={profile?.payment_terms_days ?? 14}
    />
  );
}
