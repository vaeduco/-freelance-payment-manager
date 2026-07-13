"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export interface ClientInput {
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  is_flagged?: boolean;
}

type ActionResult = { ok: true } | { error: string };

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/income");
  revalidatePath("/clients");
}

export async function createClientRecord(
  input: ClientInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      name: input.name.trim(),
      email: input.email,
      company: input.company,
      notes: input.notes,
      is_flagged: input.is_flagged ?? false,
    });
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateClientRecord(
  id: string,
  input: ClientInput,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("clients")
      .update({
        name: input.name.trim(),
        email: input.email,
        company: input.company,
        notes: input.notes,
        ...(input.is_flagged !== undefined
          ? { is_flagged: input.is_flagged }
          : {}),
      })
      .eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleClientFlag(
  id: string,
  flagged: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("clients")
      .update({ is_flagged: flagged })
      .eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setClientArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("clients")
      .update({ is_archived: archived })
      .eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
