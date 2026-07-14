import { createClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "logos";

/**
 * Signed URL for a private `logos` object, or null. Server-only.
 * The bucket is private, so logos are never public-read; we mint a short-lived
 * signed URL when rendering (long enough to survive a Print / Save-as-PDF).
 */
export async function getLogoSignedUrl(
  logoPath: string | null | undefined,
  expiresIn = 60 * 60, // 1 hour
): Promise<string | null> {
  if (!logoPath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .createSignedUrl(logoPath, expiresIn);
  return error ? null : (data?.signedUrl ?? null);
}
