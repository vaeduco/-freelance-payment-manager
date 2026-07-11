"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

type ActionResult = { ok: true } | { error: string };

export async function updateProfile(input: {
  full_name?: string | null;
  tax_rate?: number;
  currency?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const patch: Record<string, unknown> = {};
    if (input.full_name !== undefined) patch.full_name = input.full_name;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.tax_rate !== undefined) {
      patch.tax_rate = Math.max(0, Math.min(100, input.tax_rate));
    }

    // Upsert so it works even if the profile row is somehow missing.
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...patch }, { onConflict: "id" });
    if (error) throw error;

    revalidatePath("/tax");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
