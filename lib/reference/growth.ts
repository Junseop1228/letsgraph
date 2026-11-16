// 3년 매출 성장률 (D 2026-11-17 step 5b, onboarding company-type card '빠르게 크는 회사'). Pure, unit-tested.
// Average yearly growth from two fiscal years before the latest to the latest: (latest / base)^(1/2) - 1.
// One basis per company: 연결 (CFS) first, else 별도 (OFS), never mixed. Null when a year is missing or a revenue <= 0.

export type FinRow = { company_id: string; year: number; fs_div: "CFS" | "OFS"; revenue: number | null };

export function growthOf(rows: FinRow[]): number | null {
  for (const basis of ["CFS", "OFS"] as const) {
    const series = rows.filter((r) => r.fs_div === basis && r.revenue != null);
    if (!series.length) continue;
    const latest = Math.max(...series.map((r) => r.year));
    const now = series.find((r) => r.year === latest)?.revenue ?? null;
    const base = series.find((r) => r.year === latest - 2)?.revenue ?? null;
    if (now == null || base == null || now <= 0 || base <= 0) continue;
    return Math.round((Math.sqrt(now / base) - 1) * 1000) / 1000;
  }
  return null;
}

export function revenueGrowthByCompany(fins: FinRow[]): Map<string, number> {
  const byCompany = new Map<string, FinRow[]>();
  for (const f of fins) {
    const list = byCompany.get(f.company_id);
    if (list) list.push(f);
    else byCompany.set(f.company_id, [f]);
  }
  const out = new Map<string, number>();
  for (const [id, rows] of byCompany) {
    const g = growthOf(rows);
    if (g != null) out.set(id, g);
  }
  return out;
}
