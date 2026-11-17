// B1 + B2 output -> rows for business_segments, segment_job_roles, segment_details (specs/data-pipeline FR-OPS-03).
// Checks the AI cannot be trusted with: unit conversion to 억원, a sum check against the company's DART revenue,
// job ids limited to the given list, trend points complete. Pure, unit-tested.
import type { FinancialPoint, FlowStep, Provenance } from "@/lib/contracts/domain";
import { TO_EOK, type SegmentExtractionAiOutput } from "@/lib/contracts/extraction";

export type SegmentRows = {
  segments: {
    id: string;
    company_id: string;
    name: string;
    short_name: string;
    revenue: number | null;
    operating_income: number | null;
    fiscal_year: number | null;
    calculated: boolean;
    summary: string;
    ai_generated: true;
    source_rcept_no: string;
  }[];
  jobs: { segment_id: string; job_role_id: string }[];
  details: {
    segment_id: string;
    flow: FlowStep[];
    flow_source: Provenance;
    trend: FinancialPoint[];
    trend_source: Provenance;
    job_notes: Record<string, string[]>;
    news_query: string;
  }[];
};

export type MapResult = { ok: true; rows: SegmentRows } | { ok: false; reason: string };

const eok = (v: number | null, f: number) => (v == null || !Number.isFinite(v) ? null : Math.round(v * f));
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);

/**
 * companyRevenue = the company's own DART revenue for that year (억원, 연결 first) for the sum check: the segments
 * may add up to less (a segment without figures) but never to more than 1.6x or less than 0.3x when all have figures.
 */
export function toSegmentRows(
  out: SegmentExtractionAiOutput,
  o: { companyId: string; companyName: string; rceptNo: string; filedOn: string | null; companyRevenue: number | null; allowedJobs: string[] },
): MapResult {
  const segs = out.segments.slice(0, 6);
  if (!out.found || !segs.length) return { ok: false, reason: "no segments" };
  let f = TO_EOK[out.unit];
  let revs = segs.map((s) => eok(s.revenue, f));
  // a unit read off by a power of ten (seen 2026-11-17: 3 of 176 companies at 0.01x) is corrected when every segment
  // has a figure and the corrected sum lands within 30% of the company's DART revenue
  if (o.companyRevenue && o.companyRevenue > 0 && revs.every((r) => r != null)) {
    const ratio = revs.reduce((a, b) => a! + b!, 0)! / o.companyRevenue;
    if (ratio > 1.6 || ratio < 0.3) {
      const k = [10, 100, 1000, 10_000, 0.1, 0.01, 0.001, 0.0001].find((x) => ratio * x >= 0.7 && ratio * x <= 1.3);
      if (k) {
        f *= k;
        revs = segs.map((s) => eok(s.revenue, f));
      }
    }
  }
  const known = revs.filter((r): r is number => r != null);
  if (o.companyRevenue && o.companyRevenue > 0 && known.length) {
    const ratio = known.reduce((a, b) => a + b, 0) / o.companyRevenue;
    if (ratio > 1.6) return { ok: false, reason: `segment sum ${ratio.toFixed(2)}x company revenue (unit?)` };
    if (known.length === segs.length && ratio < 0.3) return { ok: false, reason: `segment sum ${ratio.toFixed(2)}x company revenue` };
  }
  const year = Math.trunc(out.fiscalYear);
  const src: Provenance = { kind: "ai", label: `${year} 사업보고서를 AI가 정리`, ...(o.filedOn ? { date: o.filedOn } : {}) };
  const rows: SegmentRows = { segments: [], jobs: [], details: [] };
  const seenJobs = new Set<string>();
  segs.forEach((s, i) => {
    const id = `${o.companyId}-s${i + 1}`;
    rows.segments.push({
      id,
      company_id: o.companyId,
      name: clip(s.name.trim(), 60),
      short_name: clip((s.shortName || s.name).trim(), 12),
      revenue: revs[i],
      operating_income: eok(s.operatingIncome, f),
      fiscal_year: year,
      calculated: false,
      summary: clip(s.summary.trim(), 120),
      ai_generated: true,
      source_rcept_no: o.rceptNo,
    });
    const notes: Record<string, string[]> = {};
    for (const j of s.jobs) {
      if (!o.allowedJobs.includes(j.jobRoleId) || notes[j.jobRoleId] || Object.keys(notes).length >= 4) continue;
      const lines = j.notes.slice(0, 2).map((n) => clip(n.trim(), 160)).filter(Boolean);
      if (!lines.length) continue;
      notes[j.jobRoleId] = lines;
      if (!seenJobs.has(`${id}|${j.jobRoleId}`)) rows.jobs.push({ segment_id: id, job_role_id: j.jobRoleId });
      seenJobs.add(`${id}|${j.jobRoleId}`);
    }
    const trend = s.trend
      .map((p) => ({ year: Math.trunc(p.year), revenue: eok(p.revenue, f), operatingIncome: eok(p.operatingIncome, f) }))
      .filter((p): p is FinancialPoint => p.revenue != null && p.operatingIncome != null)
      .sort((a, b) => a.year - b.year)
      .slice(-3);
    rows.details.push({
      segment_id: id,
      flow: s.flow.slice(0, 4).map((x) => ({ key: clip(x.key.trim(), 12), title: clip(x.title.trim(), 40), detail: clip(x.detail.trim(), 160) })),
      flow_source: src,
      trend,
      trend_source: src,
      job_notes: notes,
      news_query: `${o.companyName} ${s.shortName || s.name}`.trim(),
    });
  });
  return { ok: true, rows };
}

/** Company trend from DART figures (연결 first, else 별도), oldest first; years without both figures are left out. */
export function companyTrend(fin: { year: number; fs_div: "CFS" | "OFS"; revenue: number | null; operating_income: number | null }[]): {
  points: FinancialPoint[];
  basis: "CFS" | "OFS" | null;
} {
  for (const div of ["CFS", "OFS"] as const) {
    const points = fin
      .filter((r) => r.fs_div === div && r.revenue != null && r.operating_income != null)
      .map((r) => ({ year: r.year, revenue: r.revenue!, operatingIncome: r.operating_income! }))
      .sort((a, b) => a.year - b.year);
    if (points.length) return { points, basis: div };
  }
  return { points: [], basis: null };
}
