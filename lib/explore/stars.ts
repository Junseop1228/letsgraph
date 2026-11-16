// Which industries and companies a job's star shows (specs/explore FR-MAP-03; D 2026-11-17 two-layer links,
// onboarding card flow, top-N per industry). Pure, unit-tested.
//   layer 1 (estimated): the top companies of each industry related to the job (lib/reference/job-industry.ts)
//   layer 2 (posting): stored links confirmed by parsed JDs; always shown, even outside the picked industries
import type { JobLink } from "@/lib/contracts/domain";
import { JOB_INDUSTRY } from "@/lib/reference/job-industry";

/** industries one star shows at most (8 keeps 45 degrees between neighbours) */
export const STAR_MAX_INDUSTRIES = 8;
/** companies per industry the graph can unfold (the biggest first) */
export const PER_INDUSTRY = 8;

/**
 * Industries of one job's star. The user's chosen industries among the related ones; nothing chosen (or none of the
 * chosen ones related) -> core industries first, then common ones, each ranked by how many companies they have.
 * Industries without reviewed companies are skipped.
 */
export function pickIndustries(
  jobId: string,
  counts: Record<string, number>,
  chosen: string[] | null = null,
  max = STAR_MAX_INDUSTRIES,
): string[] {
  const rel = JOB_INDUSTRY[jobId] ?? {};
  const related = Object.keys(rel).filter((id) => (counts[id] ?? 0) > 0);
  const wanted = chosen?.length ? related.filter((id) => chosen.includes(id)) : [];
  const pool = wanted.length ? wanted : related;
  return [...pool].sort((a, b) => rel[b] - rel[a] || (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b)).slice(0, max);
}

/** Links of one star: the stored links of the job, then an estimated link to each top company of the picked industries. */
export function starLinks(jobId: string, industries: string[], topIds: Record<string, string[]>, stored: JobLink[]): JobLink[] {
  const out = stored.filter((l) => l.jobRoleId === jobId);
  const seen = new Set(out.map((l) => l.companyId));
  for (const ind of industries)
    for (const co of topIds[ind] ?? []) {
      if (seen.has(co)) continue;
      seen.add(co);
      out.push({ jobRoleId: jobId, companyId: co, basis: "estimated" });
    }
  return out;
}

/**
 * Companies the visitor keeps on the graph without a link (watched, added by search): each one joins every star whose
 * job relates to its industry, or the first star when none does, as an estimated link. Hidden companies are removed.
 */
export function withExtras(
  links: JobLink[],
  stars: string[],
  extras: { id: string; industryId: string }[],
  hidden: string[],
): JobLink[] {
  const out = links.filter((l) => !hidden.includes(l.companyId));
  const has = new Set(out.map((l) => `${l.jobRoleId}|${l.companyId}`));
  for (const c of extras) {
    if (hidden.includes(c.id) || !stars.length) continue;
    const related = stars.filter((j) => JOB_INDUSTRY[j]?.[c.industryId]);
    for (const j of related.length ? related : [stars[0]]) {
      if (has.has(`${j}|${c.id}`)) continue;
      has.add(`${j}|${c.id}`);
      out.push({ jobRoleId: j, companyId: c.id, basis: "estimated" });
    }
  }
  return out;
}
