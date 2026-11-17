// Newest filings / IR items of the visitor's saved companies, for the header bell (specs/explore FR-DISC-04).
// GET /api/catalog/updates?ids=a,b,c (at most 50 ids). Public catalogue data only.
import { NextResponse, connection } from "next/server";
import { catalog } from "@/lib/data";
import type { Note } from "@/components/header/notification-bell";

export async function GET(req: Request) {
  await connection();
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s))
    .slice(0, 50);
  if (!ids.length) return NextResponse.json([]);
  const repo = await catalog();
  const notes: Note[] = (await repo.recentUpdates(100, ids)).map(({ companyId, companyName, update: u }) => ({
    id: `${companyId}:${u.date}:${u.title.slice(0, 24)}`,
    companyId,
    tag: u.tag,
    title: u.title,
    date: u.date,
    href: `/company/${companyId}`,
    company: companyName,
  }));
  return NextResponse.json(notes);
}
