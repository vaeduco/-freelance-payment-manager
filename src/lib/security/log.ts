import { headers } from "next/headers";
import type { createClient } from "@/lib/supabase/server";
import type { SecurityEventCategory } from "@/lib/types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface LogInput {
  category: SecurityEventCategory;
  action: string;
  summary: string;
  isAlert?: boolean;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  location?: string | null;
  device?: string | null;
  userAgent?: string | null;
}

/**
 * Append a security-activity event for a user. Best-effort: never throws and
 * never blocks the calling action — a failed log must not break a real mutation.
 */
export async function logEvent(
  supabase: ServerClient,
  userId: string,
  input: LogInput,
): Promise<void> {
  try {
    await supabase.from("security_events").insert({
      user_id: userId,
      category: input.category,
      action: input.action,
      summary: input.summary,
      is_alert: input.isAlert ?? false,
      metadata: input.metadata ?? null,
      ip: input.ip ?? null,
      location: input.location ?? null,
      device: input.device ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch {
    /* logging is best-effort */
  }
}

function parseDevice(ua: string): string | null {
  if (!ua) return null;
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /OPR|Opera/.test(ua)
      ? "Opera"
      : /Chrome/.test(ua)
        ? "Chrome"
        : /Firefox/.test(ua)
          ? "Firefox"
          : /Safari/.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Macintosh|Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

/** Best-effort request metadata (IP, geo, device) from headers. Server-only. */
export async function requestContext(): Promise<{
  ip: string | null;
  location: string | null;
  device: string | null;
  userAgent: string | null;
}> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    const fwd = h.get("x-forwarded-for");
    const ip = (fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip")) || null;
    const city = h.get("x-vercel-ip-city");
    const country = h.get("x-vercel-ip-country");
    const location =
      [city ? decodeURIComponent(city) : null, country]
        .filter(Boolean)
        .join(", ") || null;
    return { ip, location, device: parseDevice(ua), userAgent: ua || null };
  } catch {
    return { ip: null, location: null, device: null, userAgent: null };
  }
}
