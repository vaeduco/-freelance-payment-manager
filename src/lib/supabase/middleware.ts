import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  // Public so a just-issued recovery session can render it (NOT an authRoute,
  // or a signed-in recovery user would be bounced to /dashboard first).
  "/reset-password",
  // Static legal pages — reachable without an account.
  "/terms",
  "/privacy",
  // Public secure-share invoice view (token + optional password, via RPC).
  "/s",
  // Public booking page (slug-gated, via RPCs).
  "/book",
];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Refreshes the Supabase auth session on every request and enforces
 * route protection: unauthenticated users are redirected to /login,
 * authenticated users are kept out of the auth pages.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const authRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password";

  // Not signed in and visiting a protected page -> send to login.
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Enforce 2FA server-side: a user with a verified factor must step up to
    // aal2 before reaching anything except the challenge page. This is the real
    // gate — a client-side check in the login form cannot be trusted.
    let needsMfa = false;
    try {
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      needsMfa =
        !!aal && aal.currentLevel !== "aal2" && aal.nextLevel === "aal2";
    } catch {
      // Fail secure: if the check errors, still require step-up when a
      // verified factor exists.
      needsMfa = (user.factors ?? []).some((f) => f.status === "verified");
    }

    const onMfa = pathname === "/mfa";
    const onAuth = pathname === "/auth" || pathname.startsWith("/auth/");

    if (needsMfa) {
      // Until the second factor is completed, only the challenge page and the
      // auth callback are reachable.
      if (!onMfa && !onAuth) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Fully authenticated -> keep them off the challenge page and auth pages.
    if (onMfa || authRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
