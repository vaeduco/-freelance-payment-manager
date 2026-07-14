"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

const LOGO_BUCKET = "logos";

export interface ProfileInput {
  full_name?: string | null;
  business_name?: string | null;
  tax_rate?: number;
  currency?: string;
  payment_terms_days?: number;
}

/** Build the DB patch from a partial profile input (only provided keys). */
function buildPatch(input: ProfileInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.full_name !== undefined) patch.full_name = input.full_name?.trim() || null;
  if (input.business_name !== undefined) {
    patch.business_name = input.business_name?.trim() || null;
  }
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.tax_rate !== undefined) {
    patch.tax_rate = Math.max(0, Math.min(100, input.tax_rate));
  }
  if (input.payment_terms_days !== undefined) {
    patch.payment_terms_days = Math.max(0, Math.floor(input.payment_terms_days));
  }
  return patch;
}

function revalidateProfileConsumers() {
  revalidatePath("/tax");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/invoices");
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    // Upsert so it works even if the profile row is somehow missing.
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...buildPatch(input) }, { onConflict: "id" });
    if (error) throw error;

    revalidateProfileConsumers();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Save first-time-setup fields and mark onboarding done. "Finish" passes the
 * filled fields; "Skip for now" passes {} — either way onboarded_at is stamped
 * so the user isn't re-prompted (defaults apply on skip).
 */
export async function completeOnboarding(
  input: ProfileInput = {},
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { error } = await supabase.from("profiles").upsert(
      { id: user.id, ...buildPatch(input), onboarded_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (error) throw error;

    revalidateProfileConsumers();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Persist (or clear) the user's logo storage key. On replace/clear, removes the
 * previous object so we don't orphan files. The upload itself happens on the
 * client via the browser Supabase client (RLS scopes writes to `<uid>/…`).
 */
export async function updateLogoPath(
  logoPath: string | null,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("logo_path")
      .eq("id", user.id)
      .maybeSingle();

    const oldPath = existing?.logo_path ?? null;
    if (oldPath && oldPath !== logoPath) {
      // Best-effort cleanup of the replaced/removed object.
      await supabase.storage.from(LOGO_BUCKET).remove([oldPath]);
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, logo_path: logoPath }, { onConflict: "id" });
    if (error) throw error;

    revalidatePath("/settings");
    revalidatePath("/invoices");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
