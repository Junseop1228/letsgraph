// 회사 성격 (D 2026-11-17 onboarding card flow, step 5b): judged only from revenue size and 3-year revenue growth
// (companies.revenue_growth, lib/reference/growth.ts). Thresholds = Claude's call from the 2026-11-17 distribution
// of the 3,287 reviewed companies (>= 1조 451, 1천억-1조 1,086; growing 565). Pure, unit-tested.
import type { Company } from "@/lib/contracts/domain";

export type CompanyType = "large" | "mid" | "growing";

/** 억원 */
export const LARGE_MIN_REVENUE = 10_000;
export const MID_MIN_REVENUE = 1_000;
export const GROWING_MIN_REVENUE = 100;
/** average yearly revenue growth over three fiscal years (0.15 = +15% a year) */
export const GROWING_MIN_GROWTH = 0.15;

/** short = the words on the graph's condition chip (step 5c) */
export const COMPANY_TYPES: { id: CompanyType; label: string; short: string; rule: string }[] = [
  { id: "large", label: "이름 있는 큰 회사", short: "큰 회사", rule: "매출 1조 원 이상" },
  { id: "mid", label: "탄탄한 중견", short: "중견", rule: "매출 1천억~1조 원" },
  { id: "growing", label: "빠르게 크는 회사", short: "성장 기업", rule: "최근 3년 매출이 해마다 15% 이상 성장" },
];

export function isCompanyType(v: unknown): v is CompanyType {
  return v === "large" || v === "mid" || v === "growing";
}

export function companyTypeLabel(t: CompanyType): string {
  return COMPANY_TYPES.find((x) => x.id === t)!.label;
}

export function matchesType(c: Pick<Company, "revenue" | "revenueGrowth">, t: CompanyType): boolean {
  const rev = c.revenue ?? -1;
  if (t === "large") return rev >= LARGE_MIN_REVENUE;
  if (t === "mid") return rev >= MID_MIN_REVENUE && rev < LARGE_MIN_REVENUE;
  return rev >= GROWING_MIN_REVENUE && (c.revenueGrowth ?? -1) >= GROWING_MIN_GROWTH;
}

/**
 * One line on why a company is on this job's star. rank = place in its industry's list on the graph (by revenue,
 * after the type filter); relaxed = the type filter left that industry empty, so it is shown unfiltered.
 */
export function reasonLine(o: {
  basis: "posting" | "estimated";
  /** confirmed postings behind a 'posting' link (POST-07) */
  postings?: number;
  jobName: string;
  industryName: string;
  rank: number | null;
  growth: number | null | undefined;
  type: CompanyType | null;
  relaxed: boolean;
}): string {
  const parts: string[] = [];
  if (o.basis === "posting") parts.push(o.postings ? `${o.jobName} 공고 ${o.postings}건으로 확인된 회사` : `${o.jobName} 실제 공고가 확인된 회사`);
  const filtered = o.type && !o.relaxed;
  if (o.rank) parts.push(filtered ? `${o.industryName} ${companyTypeLabel(o.type!)} 중 매출 ${o.rank}위` : `${o.industryName} 매출 ${o.rank}위`);
  else if (o.basis !== "posting") parts.push(`${o.jobName} 관련 산업인 ${o.industryName}`);
  if (o.growth != null && (o.type === "growing" || o.growth >= GROWING_MIN_GROWTH))
    parts.push(`최근 3년 매출 해마다 ${o.growth >= 0 ? "+" : ""}${Math.round(o.growth * 100)}%`);
  if (o.type && o.relaxed) parts.push("조건을 조금 넓혀 보여드려요");
  return parts.join(" · ");
}
