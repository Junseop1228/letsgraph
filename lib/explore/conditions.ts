// 탐색 conditions: the industry chips and company type picked on the onboarding cards, editable later on the graph
// (D 2026-11-17 onboarding card flow, step 5c control A). Shared by the deck and the graph's condition panel. Pure, unit-tested.
import { COMPANY_TYPES, type CompanyType } from "@/lib/explore/company-type";
import { JOB_INDUSTRY } from "@/lib/reference/job-industry";

/** industry chips shown at most (onboarding card and graph panel) */
export const MAX_INDUSTRY_CHIPS = 12;

/** Industries related to any of these jobs, strongest relevance first, then the ones with more companies. */
export function relatedIndustries<T extends { id: string; count: number }>(jobIds: string[], industries: T[], max = MAX_INDUSTRY_CHIPS): T[] {
  const rel = (id: string) => Math.max(0, ...jobIds.map((j) => JOB_INDUSTRY[j]?.[id] ?? 0));
  return industries
    .filter((ind) => ind.count > 0 && rel(ind.id) > 0)
    .sort((a, b) => rel(b.id) - rel(a.id) || b.count - a.count)
    .slice(0, max);
}

/** Short words for the condition chip on the graph bar. */
export function companyTypeShort(t: CompanyType): string {
  return COMPANY_TYPES.find((x) => x.id === t)!.short;
}

/** Text of the condition chip: "산업 2 · 큰 회사", or "조건" when nothing is picked. */
export function conditionSummary(industryCount: number, type: CompanyType | null): string {
  const parts: string[] = [];
  if (industryCount > 0) parts.push(`산업 ${industryCount}`);
  if (type) parts.push(companyTypeShort(type));
  return parts.length ? parts.join(" · ") : "조건";
}

/**
 * Jobs whose star ignores the chosen industries because none of them relates to the job (pickIndustries then falls
 * back to the job's closest industries). Jobs with no related industry at all are not counted.
 */
export function jobsOutsideChoice(jobIds: string[], counts: Record<string, number>, chosen: string[] | null): string[] {
  if (!chosen?.length) return [];
  return jobIds.filter((j) => {
    const related = Object.keys(JOB_INDUSTRY[j] ?? {}).filter((id) => (counts[id] ?? 0) > 0);
    return related.length > 0 && !related.some((id) => chosen.includes(id));
  });
}

/** Lines under "조건을 조금 넓혔어요" (relax-and-tell). Empty when nothing was relaxed. */
export function relaxNotes(o: { relaxedIndustries: string[]; outsideJobs: string[]; type: CompanyType | null }): string[] {
  const out: string[] = [];
  if (o.type && o.relaxedIndustries.length)
    out.push(`${o.relaxedIndustries.join(", ")}: ${companyTypeShort(o.type)} 조건에 맞는 회사가 없어 전체를 보여줘요`);
  if (o.outsideJobs.length) out.push(`${o.outsideJobs.join(", ")}: 고른 산업과 이어지지 않아 가까운 산업을 보여줘요`);
  return out;
}
