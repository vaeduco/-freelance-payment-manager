import type { Metadata } from "next";
import { ClientsClient } from "@/components/clients/clients-client";
import { getClientsWithStats } from "@/lib/data/clients";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = {
  title: "Clients",
};

export default async function ClientsPage() {
  const [clients, profile] = await Promise.all([
    getClientsWithStats(),
    getProfile(),
  ]);

  const currency = profile?.currency ?? "USD";

  return <ClientsClient clients={clients} currency={currency} />;
}
