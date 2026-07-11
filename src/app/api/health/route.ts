import { NextResponse } from "next/server";

// Edge runtime — same runtime as the auth middleware, so this reflects
// whether the middleware can see the Supabase env vars.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  return NextResponse.json({
    hasUrl: !!url,
    url, // public value — safe to expose
    hasAnonKey: !!key,
    anonKeyLength: key ? key.length : 0,
  });
}
