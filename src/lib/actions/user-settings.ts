"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { normalizeWidgetOrder } from "@/lib/data/user-settings";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/lib/types";

type ActionResult = { ok: true } | { error: string };

const ENUMS = {
  theme: ["light", "dark", "system"],
  font_size: ["small", "medium", "large"],
  density: ["comfortable", "compact"],
  sidebar_default: ["expanded", "collapsed"],
  date_format: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
  number_format: ["1,000.00", "1.000,00"],
} as const;

function coerce<K extends keyof typeof ENUMS>(
  key: K,
  value: unknown,
): (typeof ENUMS)[K][number] {
  const allowed = ENUMS[key] as readonly string[];
  const fallback = DEFAULT_USER_SETTINGS[key] as (typeof ENUMS)[K][number];
  return typeof value === "string" && allowed.includes(value)
    ? (value as (typeof ENUMS)[K][number])
    : fallback;
}

/**
 * Upsert the caller's settings row. Enum fields are validated server-side.
 * `default_currency` is mirrored into `profiles.currency` so the app-wide
 * currency (read from the profile across every page) updates in one place.
 */
export async function saveUserSettings(input: UserSettings): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const currency =
      typeof input.default_currency === "string" && input.default_currency.trim()
        ? input.default_currency.trim().slice(0, 8)
        : DEFAULT_USER_SETTINGS.default_currency;

    const row = {
      user_id: user.id,
      theme: coerce("theme", input.theme),
      font_size: coerce("font_size", input.font_size),
      density: coerce("density", input.density),
      sidebar_default: coerce("sidebar_default", input.sidebar_default),
      date_format: coerce("date_format", input.date_format),
      number_format: coerce("number_format", input.number_format),
      default_currency: currency,
      show_both_currencies: Boolean(input.show_both_currencies),
      dashboard_widget_order: normalizeWidgetOrder(input.dashboard_widget_order),
    };

    const { error } = await supabase
      .from("user_settings")
      .upsert(row, { onConflict: "user_id" });
    if (error) return { error: error.message };

    // Keep the app-wide display currency (profiles.currency) in sync.
    await supabase.from("profiles").update({ currency }).eq("id", user.id);

    revalidatePath("/settings/appearance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Persist just the theme, without touching other prefs. Called by the sidebar
 * theme toggle so a quick light/dark flip survives a reload (Supabase is the
 * source of truth on load). Best-effort: the row is created if it doesn't exist.
 */
export async function saveThemePref(theme: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const t = (ENUMS.theme as readonly string[]).includes(theme) ? theme : "system";
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, theme: t }, { onConflict: "user_id" });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
