// 기준표 반영 (specs/data-pipeline FR-OPS-01; D 2026-11-17): writes the reference tables to the DB and opens the
// collected DART filers to the service.
//   industries   <- lib/reference/industry-map.ts (22)
//   job_families <- lib/reference/jobs.ts (8), job_roles <- lib/reference/jobs.ts (33)
//   companies    <- staging rows (industry_reviewed = false): industry from classify.ts (override > name > KSIC rule);
//                   reviewed = true unless excluded or unclassified; headline figures from company_financials
//                   (latest fiscal year, 연결 first, else 별도), labelled as DART figures.
// Rows already reviewed (hand-made seed rows) are never touched. Safe to run again.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INDUSTRIES } from "@/lib/reference/industry-map";
import { JOB_FAMILIES, JOBS } from "@/lib/reference/jobs";
import { industryForCompany } from "@/lib/reference/classify";
import { dartDate } from "@/lib/dart/parse";

export type ApplyResult = {
  dryRun: boolean;
  industries: number;
  jobFamilies: number;
  jobRoles: number;
  staging: number;
  opened: number;
  excluded: number;
  unclassified: number;
  withFigures: number;
  perIndustry: Record<string, number>;
  errors: string[];
};

type Staging = { id: string; corp_code: string | null; name: string; induty_code: string | null };
type Fin = { company_id: string; year: number; fs_div: "CFS" | "OFS"; revenue: number | null; operating_income: number | null; rcept_no: string };

async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export async function applyCatalogue(db: SupabaseClient, opts: { dryRun: boolean }): Promise<ApplyResult> {
  const errors: string[] = [];
  const write = !opts.dryRun;
  const r: ApplyResult = {
    dryRun: opts.dryRun,
    industries: INDUSTRIES.length,
    jobFamilies: JOB_FAMILIES.length,
    jobRoles: JOBS.length,
    staging: 0,
    opened: 0,
    excluded: 0,
    unclassified: 0,
    withFigures: 0,
    perIndustry: {},
    errors,
  };

  if (write) {
    const steps = [
      db.from("industries").upsert(INDUSTRIES.map((i) => ({ id: i.id, name: i.name })), { onConflict: "id" }),
      db.from("job_families").upsert(JOB_FAMILIES.map((f) => ({ id: f.id, name: f.name })), { onConflict: "id" }),
    ];
    for (const s of await Promise.all(steps)) if (s.error) errors.push(s.error.message);
    const roles = await db
      .from("job_roles")
      .upsert(JOBS.map((j) => ({ id: j.id, family_id: j.familyId, name: j.name, description: j.description })), { onConflict: "id" });
    if (roles.error) errors.push(roles.error.message);
    if (errors.length) return r; // reference rows must exist before companies point at them
  }

  const staging = await readAll<Staging>((a, b) =>
    db.from("companies").select("id, corp_code, name, induty_code").eq("industry_reviewed", false).order("id").range(a, b),
  );
  r.staging = staging.length;
  const fins = await readAll<Fin>((a, b) =>
    db.from("company_financials").select("company_id, year, fs_div, revenue, operating_income, rcept_no").order("company_id").range(a, b),
  );
  const latest = new Map<string, Fin>();
  for (const f of fins) {
    if (f.revenue == null && f.operating_income == null) continue;
    const cur = latest.get(f.company_id);
    if (!cur || f.year > cur.year || (f.year === cur.year && f.fs_div === "CFS" && cur.fs_div !== "CFS")) latest.set(f.company_id, f);
  }

  const rows = [];
  for (const c of staging) {
    const m = industryForCompany(c.corp_code, c.induty_code, c.name);
    if (m.excluded) {
      r.excluded++;
      continue;
    }
    if (!m.industryId) {
      r.unclassified++;
      continue;
    }
    const f = latest.get(c.id);
    if (f) r.withFigures++;
    r.perIndustry[m.industryId] = (r.perIndustry[m.industryId] ?? 0) + 1;
    rows.push({
      id: c.id,
      name: c.name,
      industry_id: m.industryId,
      industry_reviewed: true,
      revenue: f?.revenue ?? null,
      operating_income: f?.operating_income ?? null,
      fiscal_year: f?.year ?? null,
      basis_note: f ? (f.fs_div === "CFS" ? "연결" : "별도") : null,
      source_kind: f ? "filing" : null,
      source_label: f ? `DART 사업보고서 ${f.year} (${f.fs_div === "CFS" ? "연결" : "별도"})` : null,
      source_date: f ? dartDate(f.rcept_no.slice(0, 8)) : null,
    });
  }
  r.opened = rows.length;
  if (write)
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db.from("companies").upsert(rows.slice(i, i + 500), { onConflict: "id" });
      if (error) errors.push(`companies ${i}: ${error.message}`);
    }
  return r;
}
