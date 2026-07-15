"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/security/log";

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
    await logEvent(supabase, user.id, {
      category: "client",
      action: "client.create",
      summary: `Added client “${input.name.trim()}”`,
    });
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
    const user = await requireUser();
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
    await logEvent(supabase, user.id, {
      category: "client",
      action: "client.update",
      summary: `Updated client “${input.name.trim()}”`,
      metadata: { client_id: id },
    });
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
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("clients")
      .update({ is_flagged: flagged })
      .eq("id", id);
    if (error) throw error;
    await logEvent(supabase, user.id, {
      category: "client",
      action: "client.flag",
      summary: flagged ? "Flagged a client" : "Unflagged a client",
      metadata: { client_id: id },
    });
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
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("clients")
      .update({ is_archived: archived })
      .eq("id", id);
    if (error) throw error;
    await logEvent(supabase, user.id, {
      category: "client",
      action: "client.archive",
      summary: archived ? "Archived a client" : "Restored a client",
      metadata: { client_id: id },
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    await logEvent(supabase, user.id, {
      category: "client",
      action: "client.delete",
      summary: "Deleted a client",
      metadata: { client_id: id },
    });
    revalidateAll();
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
