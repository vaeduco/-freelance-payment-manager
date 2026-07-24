import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/lib/types";

/** Coerce a raw DB row into a fully-populated UserSettings (defaults fill gaps). */
function normalize(row: Record<string, unknown> | null): UserSettings {
  const d = DEFAULT_USER_SETTINGS;
  if (!row) return { ...d };
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  return {
    theme: pick(row.theme, ["light", "dark", "system"], d.theme),
    font_size: pick(row.font_size, ["small", "medium", "large"], d.font_size),
    density: pick(row.density, ["comfortable", "compact"], d.density),
    sidebar_default: pick(row.sidebar_default, ["expanded", "collapsed"], d.sidebar_default),
    date_format: pick(
      row.date_format,
      ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
      d.date_format,
    ),
    number_format: pick(row.number_format, ["1,000.00", "1.000,00"], d.number_format),
    default_currency:
      typeof row.default_currency === "string" && row.default_currency
        ? row.default_currency
        : d.default_currency,
    show_both_currencies: Boolean(row.show_both_currencies),
  };
}

/**
 * Fetch the current user's settings, creating a default row on first access.
 * Returns defaults (in-memory) if there's no session — callers are behind auth.
 */
export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...DEFAULT_USER_SETTINGS };

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) return normalize(data as Record<string, unknown>);

  // First access: seed a default row (idempotent under the unique index).
  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...DEFAULT_USER_SETTINGS },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  const { data: created } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return normalize((created as Record<string, unknown>) ?? null);
}
