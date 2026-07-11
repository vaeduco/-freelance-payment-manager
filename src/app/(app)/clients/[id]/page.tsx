import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientDetail } from "@/components/clients/client-detail";
import { getClient, getClientHistory } from "@/lib/data/clients";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = {
  title: "Client",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [client, history, profile] = await Promise.all([
    getClient(id),
    getClientHistory(id),
    getProfile(),
  ]);

  if (!client) notFound();

  const currency = profile?.currency ?? "USD";

  return (
    <ClientDetail
      client={client}
      invoices={history.invoices}
      payments={history.payments}
      currency={currency}
    />
  );
}
