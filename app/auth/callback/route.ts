// OAuth / magic-link callback: exchanges the code, then sends first-time users to the consent step (FR-ACCT-01).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/explore";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/explore";
  if (!code) return NextResponse.redirect(new URL("/auth/error?error=no_code", url.origin));

  const db = await createClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, url.origin));

  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub;
  const { data: profile } = uid ? await db.from("profiles").select("user_id").eq("user_id", uid).maybeSingle() : { data: null };
  const dest = profile ? next : `/auth/consent?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(dest, url.origin));
}
