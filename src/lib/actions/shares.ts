"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/security/log";

export interface ShareInput {
  password: string | null;
  expiresAt: string | null; // ISO or null
  maxViews: number | null;
}

type CreateResult = { ok: true; token: string } | { error: string };
type ActionResult = { ok: true } | { error: string };

/** Create/replace a secure share link for an invoice (password hashed in-DB). */
export async function createShareLink(
  invoiceId: string,
  input: ShareInput,
): Promise<CreateResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_shared_link", {
      p_invoice_id: invoiceId,
      p_password: input.password && input.password.length ? input.password : null,
      p_expires_at: input.expiresAt,
      p_max_views:
        input.maxViews && input.maxViews >= 1 ? Math.floor(input.maxViews) : null,
    });
    if (error) throw error;
    await logEvent(supabase, user.id, {
      category: "share",
      action: "share.create",
      summary: "Created a secure invoice share link",
      isAlert: true,
      metadata: { invoice_id: invoiceId },
    });
    revalidatePath(`/invoices/${invoiceId}`);
    return { ok: true, token: (data as { token: string }).token };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Revoke the invoice's share link (link stops working immediately). */
export async function revokeShareLink(invoiceId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("shared_links")
      .update({ revoked: true })
      .eq("invoice_id", invoiceId);
    if (error) throw error;
    await logEvent(supabase, user.id, {
      category: "share",
      action: "share.revoke",
      summary: "Revoked an invoice share link",
      metadata: { invoice_id: invoiceId },
    });
    revalidatePath(`/invoices/${invoiceId}`);
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
