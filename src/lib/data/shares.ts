import { createClient } from "@/lib/supabase/server";
import type { SharedLink } from "@/lib/types";

/** The owner's share link for an invoice (password_hash is never returned). */
export async function getShareLinkForInvoice(
  invoiceId: string,
): Promise<SharedLink | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shared_links")
    .select(
      "id, invoice_id, token, password_hash, expires_at, max_views, view_count, revoked, created_at",
    )
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    invoice_id: data.invoice_id,
    token: data.token,
    has_password: data.password_hash != null,
    expires_at: data.expires_at,
    max_views: data.max_views,
    view_count: data.view_count,
    revoked: data.revoked,
    created_at: data.created_at,
  };
}
