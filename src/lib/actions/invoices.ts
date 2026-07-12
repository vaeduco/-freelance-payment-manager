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
  rate_type: "fixed" | "hourly";
  tracked_hours: number | null;
  hourly_rate: number | null;
  payment_method_id: string | null;
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
        rate_type: input.rate_type,
        tracked_hours: input.rate_type === "hourly" ? input.tracked_hours : null,
        hourly_rate: input.rate_type === "hourly" ? input.hourly_rate : null,
        payment_method_id: input.payment_method_id,
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
        payment_method_id: input.payment_method_id,
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
        rate_type: input.rate_type,
        tracked_hours: input.rate_type === "hourly" ? input.tracked_hours : null,
        hourly_rate: input.rate_type === "hourly" ? input.hourly_rate : null,
        payment_method_id: input.payment_method_id,
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
          payment_method_id: input.payment_method_id,
          notes: "Invoice marked paid",
        });
      }
    } else if (!nowPaid && wasPaid) {
      // Transitioned out of paid -> remove the linked income.
      await supabase.from("payments").delete().eq("invoice_id", id);
    } else if (nowPaid && wasPaid && Number(prev.amount) !== input.amount) {
      // Still paid but amount changed -> keep income in sync.
      const { data: linked } = await supabase
        .from("payments")
        .select("id")
        .eq("invoice_id", id);
      const linkedCount = linked?.length ?? 0;
      if (linkedCount === 0) {
        // Paid invoice with no backing payment (e.g. its payment was deleted):
        // record the income so it isn't silently lost.
        await supabase.from("payments").insert({
          user_id: user.id,
          invoice_id: id,
          client_id: input.client_id,
          amount: input.amount,
          payment_date: todayISO(),
          project_type: input.project_type,
          payment_method_id: input.payment_method_id,
          notes: "Invoice marked paid",
        });
      } else if (linkedCount === 1) {
        await supabase
          .from("payments")
          .update({ amount: input.amount, project_type: input.project_type })
          .eq("invoice_id", id);
      }
      // If multiple payments are linked (manually logged partials), leave them
      // untouched rather than clobbering the user's payment history.
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
        payment_method_id: inv.payment_method_id,
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
