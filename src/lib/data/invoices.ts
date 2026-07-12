import { createClient } from "@/lib/supabase/server";
import type { InvoiceWithClient } from "@/lib/types";

export async function getInvoicesWithClients(): Promise<InvoiceWithClient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "*, client:clients(id, name, company), payment_method:payment_methods(id, name, account_name, details)",
    )
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as InvoiceWithClient[];
}

export async function getInvoice(id: string): Promise<InvoiceWithClient | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select(
      "*, client:clients(id, name, company), payment_method:payment_methods(id, name, account_name, details)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as InvoiceWithClient) ?? null;
}

/** Distinct project types the user has used (for filter dropdowns). */
export async function getProjectTypes(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: inv }, { data: pay }] = await Promise.all([
    supabase.from("invoices").select("project_type"),
    supabase.from("payments").select("project_type"),
  ]);
  const set = new Set<string>();
  for (const r of inv ?? []) if (r.project_type) set.add(r.project_type);
  for (const r of pay ?? []) if (r.project_type) set.add(r.project_type);
  return Array.from(set).sort();
}
