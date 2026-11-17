// DART 기업 범위 수집 수동 실행 (specs/data-pipeline FR-OPS-02). Same guard as /api/dev/seed.
// POST /api/dev/dart-universe with header "x-seed-token: $SEED_TOKEN"
//   ?months=12          look-back window for 사업보고서 filings (1-12, default 12)
//   ?limit=20           only the first N filers (trial run)
//   ?dry=1              call DART but write nothing
//   ?info=0             skip 기업개황 (사업자등록번호, 업종 코드)
//   ?financials=0       skip 매출·영업이익
// Disabled unless SEED_TOKEN and DART_API_KEY are set. Safe to run again (upserts; failures never erase stored data).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DartClient } from "@/lib/dart/client";
import { collectUniverse } from "@/lib/dart/universe";

export const maxDuration = 300;

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (!token || req.headers.get("x-seed-token") !== token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.DART_API_KEY) return NextResponse.json({ error: "DART_API_KEY is not set" }, { status: 400 });

  const params = new URL(req.url).searchParams;
  const months = Math.min(12, Math.max(1, Math.trunc(Number(params.get("months") ?? 12)) || 12));
  const limit = Math.max(0, Math.trunc(Number(params.get("limit") ?? 0)) || 0);

  const result = await collectUniverse(createAdminClient(), DartClient.fromEnv(), {
    months,
    limit: limit || undefined,
    dryRun: params.get("dry") === "1",
    info: params.get("info") !== "0",
    financials: params.get("financials") !== "0",
  });
  return NextResponse.json(result);
}
