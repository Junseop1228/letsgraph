// 기업 한 곳의 산업 (기준표 ①; specs/data-pipeline FR-OPS-01). Order: the per-company exception, then the company
// name (principle 2: "…홀딩스" / "…지주" = group holding company, "…금융지주" = finance), then the KSIC rule.
// industry-map.ts and industry-overrides.ts stay import-free so scripts can load them directly.
import { industryForKsic, type IndustryMatch } from "@/lib/reference/industry-map";
import { INDUSTRY_OVERRIDES } from "@/lib/reference/industry-overrides";

export type CompanyIndustry = IndustryMatch & {
  /** override = per-company exception, name = holding-company name, rule = KSIC prefix, none = no code or no rule */
  source: "override" | "name" | "rule" | "none";
  /** the company stays out of the service (no business to explore) */
  excluded: boolean;
};

const FINANCE_HOLDING = /금융지주$/;
const HOLDING_NAME = /(홀딩스|지주)$/;

/** Industry implied by the company name alone, if any (scripts mirror this). */
export function industryFromName(name: string | null | undefined): string | null {
  const n = (name ?? "").replace(/\s/g, "");
  if (FINANCE_HOLDING.test(n)) return "finance";
  if (HOLDING_NAME.test(n)) return "holding";
  return null;
}

export function industryForCompany(
  corpCode: string | null | undefined,
  ksic: string | null | undefined,
  name?: string | null,
): CompanyIndustry {
  const o = corpCode ? INDUSTRY_OVERRIDES[corpCode] : undefined;
  if (o) return { industryId: o.industryId, rule: null, ambiguous: false, source: "override", excluded: o.industryId === null };
  const byName = industryFromName(name);
  if (byName) return { industryId: byName, rule: null, ambiguous: false, source: "name", excluded: false };
  const m = industryForKsic(ksic);
  return { ...m, source: m.industryId ? "rule" : "none", excluded: false };
}
