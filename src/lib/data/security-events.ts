import { createClient } from "@/lib/supabase/server";
import type { SecurityEvent, SecurityEventCategory } from "@/lib/types";

export async function getSecurityEvents(opts?: {
  category?: SecurityEventCategory;
  categories?: SecurityEventCategory[];
  alertsOnly?: boolean;
  limit?: number;
}): Promise<SecurityEvent[]> {
  const supabase = await createClient();
  let q = supabase
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.category) q = q.eq("category", opts.category);
  if (opts?.categories) q = q.in("category", opts.categories);
  if (opts?.alertsOnly) q = q.eq("is_alert", true);
  const { data } = await q;
  return (data ?? []) as SecurityEvent[];
}

export async function getUnreadAlertCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq("is_alert", true)
    .is("read_at", null);
  return count ?? 0;
}
