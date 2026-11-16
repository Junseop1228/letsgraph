// Reviewed catalogue companies by id (graph extras, watched lists kept in the browser). Public catalogue data only.
// GET /api/catalog/companies?ids=a,b,c (at most 100 ids)
import { NextResponse, connection } from "next/server";
import { catalog } from "@/lib/data";

export async function GET(req: Request) {
  await connection();
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s))
    .slice(0, 100);
  if (!ids.length) return NextResponse.json([]);
  const repo = await catalog();
  return NextResponse.json(await repo.companiesByIds(ids));
}
