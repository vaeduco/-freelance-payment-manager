"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

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

    // If this payment settles an invoice, mark it paid.
    if (input.invoice_id) {
      await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", input.invoice_id)
        .neq("status", "paid");
    }

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
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
