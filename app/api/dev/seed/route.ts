// Loads the demo catalogue (lib/data/fixtures.ts) into Supabase so DATA_SOURCE=supabase shows the same screens.
// POST /api/dev/seed with header "x-seed-token: $SEED_TOKEN". Disabled unless SEED_TOKEN is set. Idempotent (upserts).
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COMPANIES,
  COMPANY_DETAILS,
  INDUSTRIES,
  JOB_FAMILIES,
  JOB_LINKS,
  JOB_ROLES,
  SEGMENTS,
  SEGMENT_DETAILS,
} from "@/lib/data/fixtures";

export async function POST(req: Request) {
  const token = process.env.SEED_TOKEN;
  if (!token || req.headers.get("x-seed-token") !== token) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = createAdminClient();
  const steps: [string, () => PromiseLike<{ error: { message: string } | null }>][] = [
    ["industries", () => db.from("industries").upsert(INDUSTRIES)],
    ["job_families", () => db.from("job_families").upsert(JOB_FAMILIES)],
    ["job_roles", () => db.from("job_roles").upsert(JOB_ROLES.map((r) => ({ id: r.id, family_id: r.groupId, name: r.name, description: r.description })))],
    [
      "companies",
      () =>
        db.from("companies").upsert(
          COMPANIES.map((c) => ({
            id: c.id, corp_code: c.corpCode ?? null, name: c.name, industry_id: c.industryId, industry_reviewed: true,
            revenue: c.revenue, operating_income: c.operatingIncome, fiscal_year: c.fiscalYear, basis_note: c.basisNote ?? null,
            source_kind: c.source?.kind ?? null, source_label: c.source?.label ?? null, source_date: c.source?.date ?? null, has_detail: c.hasDetail,
          })),
        ),
    ],
    ["business_segments", () => db.from("business_segments").upsert(SEGMENTS.map((s) => ({ id: s.id, company_id: s.companyId, name: s.name, short_name: s.shortName, revenue: s.revenue, operating_income: s.operatingIncome, calculated: s.calculated, summary: s.summary, fiscal_year: 2025 })))],
    ["segment_job_roles", () => db.from("segment_job_roles").upsert(SEGMENTS.flatMap((s) => s.jobRoleIds.map((j) => ({ segment_id: s.id, job_role_id: j }))))],
    ["segment_details", () => db.from("segment_details").upsert(SEGMENT_DETAILS.map((d) => ({ segment_id: d.segmentId, flow: d.flow, flow_source: d.flowSource, trend: d.trend, trend_source: d.trendSource, job_notes: d.jobNotes, example_posting_id: d.examplePostingId ?? null, news_query: d.newsQuery })))],
    ["company_details", () => db.from("company_details").upsert(COMPANY_DETAILS.map((d) => ({ company_id: d.companyId, trend: d.trend, trend_source: d.trendSource, news_query: d.newsQuery })))],
    ["job_links", () => db.from("job_links").upsert(JOB_LINKS.map((l) => ({ job_role_id: l.jobRoleId, company_id: l.companyId, basis: l.basis })))],
  ];
  const done: string[] = [];
  for (const [name, run] of steps) {
    const { error } = await run();
    if (error) return NextResponse.json({ error: `${name}: ${error.message}`, done }, { status: 500 });
    done.push(name);
  }
  return NextResponse.json({ ok: true, done });
}
