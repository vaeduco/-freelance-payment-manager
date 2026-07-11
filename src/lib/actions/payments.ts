"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { reconcileInvoicePaidStatus } from "@/lib/invoice-sync";

export interface PaymentInput {
  client_id: string | null;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  project_type: string | null;
  notes: string | null;
}

type ActionResult = { ok: true } | { error: string };

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/income");
  revalidatePath("/clients");
  revalidatePath("/tax");
}

export async function createPayment(
  input: PaymentInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      client_id: input.client_id,
      invoice_id: input.invoice_id,
      amount: input.amount,
      payment_date: input.payment_date,
      project_type: input.project_type,
      notes: input.notes,
    });
    if (error) throw error;

    // Mark the linked invoice paid only once payments cover its amount.
    await reconcileInvoicePaidStatus(supabase, input.invoice_id);

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updatePayment(
  id: string,
  input: PaymentInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    // Capture the previous invoice link so we can reconcile both invoices.
    const { data: prev } = await supabase
      .from("payments")
      .select("invoice_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("payments")
      .update({
        client_id: input.client_id,
        invoice_id: input.invoice_id,
        amount: input.amount,
        payment_date: input.payment_date,
        project_type: input.project_type,
        notes: input.notes,
      })
      .eq("id", id);
    if (error) throw error;

    const prevInvoiceId = (prev as { invoice_id: string | null } | null)
      ?.invoice_id;
    if (prevInvoiceId && prevInvoiceId !== input.invoice_id) {
      await reconcileInvoicePaidStatus(supabase, prevInvoiceId);
    }
    await reconcileInvoicePaidStatus(supabase, input.invoice_id);

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    // Capture the invoice link before deleting so we can revert its status.
    const { data: prev } = await supabase
      .from("payments")
      .select("invoice_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw error;

    await reconcileInvoicePaidStatus(
      supabase,
      (prev as { invoice_id: string | null } | null)?.invoice_id,
    );

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
