import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types";

/** All of the user's payment methods, default first then alphabetical. */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PaymentMethod[];
}
