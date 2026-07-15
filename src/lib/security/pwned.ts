import { pwnedRange } from "@/lib/actions/security";

/** SHA-1 hex (uppercase) of a string, via Web Crypto. Browser-only. */
async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Check a password against Have I Been Pwned using k-anonymity.
 * Returns the number of breaches it appears in (0 = definitively not found), or
 * `null` when the check could not be completed (HIBP unreachable). Callers must
 * NOT treat `null` as "safe" — it means "unknown". The full password is never
 * sent anywhere: only the first 5 chars of its SHA-1 hash go to our proxy.
 * Browser-only (uses Web Crypto).
 */
export async function checkPasswordPwned(
  password: string,
): Promise<number | null> {
  if (!password) return 0;
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const body = await pwnedRange(prefix);
  // The proxy returns "" only on failure; a real HIBP range is never empty
  // (Add-Padding guarantees content), so an empty body means "check failed".
  if (!body) return null;
  for (const line of body.split("\n")) {
    const [suf, count] = line.trim().split(":");
    if (suf && suf.toUpperCase() === suffix) {
      return parseInt(count ?? "0", 10) || 0;
    }
  }
  return 0;
}
