import { createClient } from "@/lib/supabase/server";
import type { PaymentWithRelations } from "@/lib/types";

export async function getPaymentsWithRelations(): Promise<
  PaymentWithRelations[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, client:clients(id, name), invoice:invoices(id, service_description)",
    )
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PaymentWithRelations[];
}
