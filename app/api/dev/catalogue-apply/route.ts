// 기준표 반영 수동 실행 (specs/data-pipeline FR-OPS-01). Same guard as /api/dev/seed.
// POST /api/dev/catalogue-apply with header "x-seed-token: $SEED_TOKEN"   (?dry=1 = count only, write nothing)
// Writes industries, job families, job roles and opens the collected DART filers (lib/reference/apply.ts).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyCatalogue } from "@/lib/reference/apply";

export const maxDuration = 300;

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (!token || req.headers.get("x-seed-token") !== token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  return NextResponse.json(await applyCatalogue(createAdminClient(), { dryRun }));
}
