// 기업 검색 (specs/company FR-CORP-04): reviewed catalogue companies whose name contains q, biggest first, at most 10.
// Public catalogue data only. GET /api/catalog/search?q=삼성
import { NextResponse, connection } from "next/server";
import { catalog } from "@/lib/data";

export async function GET(req: Request) {
  await connection();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 40);
  if (!q) return NextResponse.json([]);
  const repo = await catalog();
  return NextResponse.json(await repo.searchCompanies(q));
}
