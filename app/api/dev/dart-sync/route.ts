// DART 수집 수동 실행 (specs/data-pipeline FR-OPS-02). Same guard as /api/dev/seed.
// POST /api/dev/dart-sync with header "x-seed-token: $SEED_TOKEN"
//   ?years=3            recent fiscal years to fetch (1-5, default 3)
//   ?add=삼성전자,LG화학  company names to add from DART (exact names, up to 20)
// Disabled unless SEED_TOKEN and DART_API_KEY are set. Safe to run again (upserts; failures never erase stored data).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DartClient } from "@/lib/dart/client";
import { syncDart } from "@/lib/dart/collect";

export const maxDuration = 300;

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (!token || req.headers.get("x-seed-token") !== token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.DART_API_KEY) return NextResponse.json({ error: "DART_API_KEY is not set" }, { status: 400 });

  const params = new URL(req.url).searchParams;
  const years = Math.min(5, Math.max(1, Math.trunc(Number(params.get("years") ?? 3)) || 3));
  const add = (params.get("add") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const result = await syncDart(createAdminClient(), DartClient.fromEnv(), { years, add });
  return NextResponse.json(result);
}
