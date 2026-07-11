import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientWithStats,
  Invoice,
  Payment,
  PaymentWithRelations,
} from "@/lib/types";
import { daysBetween, isOutstanding } from "@/lib/utils";

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Client) ?? null;
}

/** All clients augmented with payment aggregates (computed in-app). */
export async function getClientsWithStats(): Promise<ClientWithStats[]> {
  const supabase = await createClient();
  const [{ data: clients }, { data: invoices }, { data: payments }] =
    await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("invoices").select("*"),
      supabase.from("payments").select("*"),
    ]);

  return computeClientStats(
    (clients ?? []) as Client[],
    (invoices ?? []) as Invoice[],
    (payments ?? []) as Payment[],
  );
}

/** Payment + invoice history for a single client's detail view. */
export async function getClientHistory(clientId: string): Promise<{
  invoices: Invoice[];
  payments: PaymentWithRelations[];
}> {
  const supabase = await createClient();
  const [{ data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("issue_date", { ascending: false }),
    supabase
      .from("payments")
      .select("*, client:clients(id, name), invoice:invoices(id, service_description)")
      .eq("client_id", clientId)
      .order("payment_date", { ascending: false }),
  ]);
  return {
    invoices: (invoices ?? []) as Invoice[],
    payments: (payments ?? []) as unknown as PaymentWithRelations[],
  };
}

export function computeClientStats(
  clients: Client[],
  invoices: Invoice[],
  payments: Payment[],
): ClientWithStats[] {
  return clients.map((client) => {
    const clientInvoices = invoices.filter((i) => i.client_id === client.id);
    const clientPayments = payments.filter((p) => p.client_id === client.id);

    const total_paid = clientPayments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = clientInvoices
      .filter((i) => isOutstanding(i))
      .reduce((s, i) => s + Number(i.amount), 0);

    const last_payment_date =
      clientPayments.length > 0
        ? clientPayments
            .map((p) => p.payment_date)
            .sort()
            .at(-1)!
        : null;

    // Average days to pay, based on invoices that were marked paid.
    const paidWithDates = clientInvoices.filter(
      (i) => i.status === "paid" && i.paid_at,
    );
    const avg_days_to_pay =
      paidWithDates.length > 0
        ? Math.round(
            paidWithDates.reduce(
              (s, i) =>
                s + Math.max(0, daysBetween(i.issue_date, i.paid_at!.slice(0, 10))),
              0,
            ) / paidWithDates.length,
          )
        : null;

    return {
      ...client,
      total_paid,
      outstanding,
      invoice_count: clientInvoices.length,
      last_payment_date,
      avg_days_to_pay,
    };
  });
}
