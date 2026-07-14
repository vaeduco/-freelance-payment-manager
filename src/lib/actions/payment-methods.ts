"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export interface PaymentMethodInput {
  name: string;
  account_name: string | null;
  details: string | null;
  payment_link: string | null;
  is_default: boolean;
}

type ActionResult = { ok: true } | { error: string };

function revalidateAll() {
  revalidatePath("/payment-methods");
  revalidatePath("/settings");
  revalidatePath("/invoices");
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

/** Clear the default flag on all of the user's methods (before setting a new one). */
async function clearDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  await supabase
    .from("payment_methods")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
}

export async function createPaymentMethod(
  input: PaymentMethodInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    if (input.is_default) await clearDefaults(supabase, user.id);
    const { error } = await supabase.from("payment_methods").insert({
      user_id: user.id,
      name: input.name.trim(),
      account_name: input.account_name?.trim() || null,
      details: input.details?.trim() || null,
      payment_link: input.payment_link?.trim() || null,
      is_default: input.is_default,
    });
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updatePaymentMethod(
  id: string,
  input: PaymentMethodInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    // Confirm the row exists (and is ours, via RLS) BEFORE clearing defaults,
    // so a stale/deleted id can't wipe our current default under a false success.
    const { data: existing } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "That payment method no longer exists." };
    if (input.is_default) await clearDefaults(supabase, user.id);
    const { error } = await supabase
      .from("payment_methods")
      .update({
        name: input.name.trim(),
        account_name: input.account_name?.trim() || null,
        details: input.details?.trim() || null,
        payment_link: input.payment_link?.trim() || null,
        is_default: input.is_default,
      })
      .eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setDefaultPaymentMethod(
  id: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "That payment method no longer exists." };
    await clearDefaults(supabase, user.id);
    const { error } = await supabase
      .from("payment_methods")
      .update({ is_default: true })
      .eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deletePaymentMethod(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
