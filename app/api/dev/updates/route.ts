// B3 기업 소식 수동 실행 (specs/company FR-CORP-02). Same guard as /api/dev/seed.
// POST /api/dev/updates with header "x-seed-token: $SEED_TOKEN"
//   ?ids=a,b,c        these companies only
//   ?analysed=1       every company with AI segments (B1/B2 done)
//   ?limit=N  ?budget=0.5 (USD, default 0.5)  ?concurrency=3
// Disabled unless SEED_TOKEN and DART_API_KEY are set (without the Gemini key every filing is tagged 전사).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DartClient } from "@/lib/dart/client";
import { refreshUpdatesMany } from "@/lib/dart/analyze";

export const maxDuration = 300;

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (!token || req.headers.get("x-seed-token") !== token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.DART_API_KEY) return NextResponse.json({ error: "DART_API_KEY is not set" }, { status: 400 });

  const p = new URL(req.url).searchParams;
  const db = createAdminClient();
  let ids = p.get("ids")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (p.get("analysed") === "1") {
    const { data } = await db.from("business_segments").select("company_id").not("source_rcept_no", "is", null).limit(5000);
    ids = [...new Set([...ids, ...(data ?? []).map((r) => String(r.company_id))])];
  }
  const limit = Math.max(0, Math.trunc(Number(p.get("limit") ?? 0)) || 0);
  if (limit) ids = ids.slice(0, limit);
  if (!ids.length) return NextResponse.json({ error: "no companies (use ids= or analysed=1)" }, { status: 400 });

  const budgetUsd = Math.min(2, Math.max(0.01, Number(p.get("budget") ?? 0.5) || 0.5));
  const concurrency = Math.min(6, Math.max(1, Math.trunc(Number(p.get("concurrency") ?? 3)) || 3));
  const out = await refreshUpdatesMany(db, DartClient.fromEnv(), ids, { budgetUsd, concurrency });
  return NextResponse.json({ companies: ids.length, ...out });
}
