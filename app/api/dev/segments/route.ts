// B1 + B2 미리 분석 수동 실행 (specs/data-pipeline FR-OPS-03). Same guard as /api/dev/seed.
// POST /api/dev/segments with header "x-seed-token: $SEED_TOKEN"
//   ?ids=a,b,c        these companies only (pilot)
//   ?core=1           the core set (scope C: graph top companies per industry, watched, posted)
//   ?limit=N          only the first N of the list
//   ?budget=1.5       stop starting new companies after this many USD (default 1)
//   ?concurrency=3    AI calls at a time (1-6)
//   ?force=1          redo companies that already have AI segments (hand-made data is never touched)
// Disabled unless SEED_TOKEN, DART_API_KEY and the Gemini key are set. Safe to run again (done companies are skipped).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DartClient } from "@/lib/dart/client";
import { analyzeMany, coreSet } from "@/lib/dart/analyze";
import { aiEnabled } from "@/lib/ai/tasks";

export const maxDuration = 300;

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (!token || req.headers.get("x-seed-token") !== token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.DART_API_KEY || !aiEnabled()) return NextResponse.json({ error: "DART or Gemini key is not set" }, { status: 400 });

  const p = new URL(req.url).searchParams;
  const db = createAdminClient();
  let ids = p.get("ids")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (p.get("core") === "1") ids = [...new Set([...ids, ...(await coreSet(db))])];
  const limit = Math.max(0, Math.trunc(Number(p.get("limit") ?? 0)) || 0);
  if (limit) ids = ids.slice(0, limit);
  if (!ids.length) return NextResponse.json({ error: "no companies (use ids= or core=1)" }, { status: 400 });

  const budgetUsd = Math.min(5, Math.max(0.01, Number(p.get("budget") ?? 1) || 1));
  const concurrency = Math.min(6, Math.max(1, Math.trunc(Number(p.get("concurrency") ?? 3)) || 3));
  const out = await analyzeMany(db, DartClient.fromEnv(), ids, { budgetUsd, concurrency, force: p.get("force") === "1" });
  return NextResponse.json({ companies: ids.length, ...out });
}
