import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reconciles an invoice's paid status against the payments linked to it.
 * The payments table is the single source of truth for income; an invoice is
 * "paid" only when its linked payments cover its amount. Called after any
 * payment insert/update/delete so the invoice status (and therefore the
 * outstanding totals) never drift out of sync with recorded income.
 */
export async function reconcileInvoicePaidStatus(
  supabase: SupabaseClient,
  invoiceId: string | null | undefined,
): Promise<void> {
  if (!invoiceId) return;

  const { data: inv } = await supabase
    .from("invoices")
    .select("amount, status, paid_at")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return;

  const { data: pays } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const sum = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const amount = Number(inv.amount);
  // Small epsilon guards against floating-point rounding on the sum.
  const fullyPaid = amount > 0 && sum + 0.001 >= amount;

  if (fullyPaid && inv.status !== "paid") {
    await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: inv.paid_at ?? new Date().toISOString(),
      })
      .eq("id", invoiceId);
  } else if (!fullyPaid && inv.status === "paid") {
    // No longer covered -> revert to 'sent'; effectiveStatus() re-derives
    // 'overdue' at read time if the due date has passed.
    await supabase
      .from("invoices")
      .update({ status: "sent", paid_at: null })
      .eq("id", invoiceId);
  }
}
