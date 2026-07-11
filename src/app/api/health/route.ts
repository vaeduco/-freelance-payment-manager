import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Edge runtime — same runtime as the auth middleware.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieNames = request.cookies.getAll().map((c) => c.name);

  let user: string | null = null;
  let err: string | null = null;
  try {
    const supabase = createServerClient(url!, key!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    });
    const { data, error } = await supabase.auth.getUser();
    user = data?.user?.email ?? null;
    err = error ? `${error.name}: ${error.message} (status=${error.status})` : null;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    err = "exception: " + m;
  }

  return NextResponse.json({
    diag: 2,
    hasUrl: !!url,
    urlHasWhitespace: url ? url !== url.trim() : null,
    keyLen: key ? key.length : 0,
    cookieNames,
    user,
    err,
  });
}
