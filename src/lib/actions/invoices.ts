"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/utils";
import type { Invoice } from "@/lib/types";

export interface InvoiceInput {
  client_id: string | null;
  service_description: string;
  amount: number;
  status: "draft" | "sent" | "paid";
  issue_date: string;
  due_date: string;
  project_type: string | null;
}

type ActionResult = { ok: true } | { error: string };

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/income");
  revalidatePath("/clients");
  revalidatePath("/tax");
}

export async function createInvoice(input: InvoiceInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const paid = input.status === "paid";

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        client_id: input.client_id,
        service_description: input.service_description.trim(),
        amount: input.amount,
        status: input.status,
        issue_date: input.issue_date,
        due_date: input.due_date,
        project_type: input.project_type,
        paid_at: paid ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (paid) {
      await supabase.from("payments").insert({
        user_id: user.id,
        invoice_id: data.id,
        client_id: input.client_id,
        amount: input.amount,
        payment_date: todayISO(),
        project_type: input.project_type,
        notes: "Invoice marked paid",
      });
    }

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateInvoice(
  id: string,
  input: InvoiceInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new Error("Invoice not found");
    const prev = existing as Invoice;

    const nowPaid = input.status === "paid";
    const wasPaid = prev.status === "paid";

    const { error } = await supabase
      .from("invoices")
      .update({
        client_id: input.client_id,
        service_description: input.service_description.trim(),
        amount: input.amount,
        status: input.status,
        issue_date: input.issue_date,
        due_date: input.due_date,
        project_type: input.project_type,
        paid_at: nowPaid
          ? (prev.paid_at ?? new Date().toISOString())
          : null,
      })
      .eq("id", id);
    if (error) throw error;

    if (nowPaid && !wasPaid) {
      // Transitioned into paid -> record income if not already linked.
      const { count } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", id);
      if (!count) {
        await supabase.from("payments").insert({
          user_id: user.id,
          invoice_id: id,
          client_id: input.client_id,
          amount: input.amount,
          payment_date: todayISO(),
          project_type: input.project_type,
          notes: "Invoice marked paid",
        });
      }
    } else if (!nowPaid && wasPaid) {
      // Transitioned out of paid -> remove the linked income.
      await supabase.from("payments").delete().eq("invoice_id", id);
    } else if (nowPaid && wasPaid && Number(prev.amount) !== input.amount) {
      // Still paid but amount changed -> keep income in sync.
      await supabase
        .from("payments")
        .update({ amount: input.amount, project_type: input.project_type })
        .eq("invoice_id", id);
    }

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function markInvoicePaid(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing) throw new Error("Invoice not found");
    const inv = existing as Invoice;
    if (inv.status === "paid") {
      return { ok: true };
    }

    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", id);
    if (!count) {
      await supabase.from("payments").insert({
        user_id: user.id,
        invoice_id: id,
        client_id: inv.client_id,
        amount: inv.amount,
        payment_date: todayISO(),
        project_type: inv.project_type,
        notes: "Invoice marked paid",
      });
    }

    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
