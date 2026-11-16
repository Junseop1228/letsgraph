// Server side of 나의 취업 그래프: only the slice of the catalogue the stars can show (top N per picked industry, stored
// links, their segments), never the whole company list (specs/explore FR-MAP-03).
import "server-only";
import type { BusinessSegment, Company, Industry, JobLink } from "@/lib/contracts/domain";
import type { CatalogRepo } from "@/lib/data/repo";
import type { CompanyType } from "@/lib/explore/company-type";
import { PER_INDUSTRY, pickIndustries, starLinks } from "@/lib/explore/stars";

export type GraphLoad = {
  industries: Industry[];
  /** reviewed companies per industry */
  industryTotals: Record<string, number>;
  companies: Company[];
  links: JobLink[];
  segmentsByCompany: Record<string, BusinessSegment[]>;
  /** industries where the company-type filter left nothing, so they are shown unfiltered (relax-and-tell) */
  relaxed: string[];
  /** place of each top company in its industry's list on the graph (1 = biggest revenue, after the type filter) */
  ranks: Record<string, number>;
};

/**
 * Graph data for these jobs (all job cards the visitor may turn on). `chosen` = industries picked on the onboarding
 * card; `type` = company type picked on the onboarding card (D 2026-11-17 step 5b).
 */
export async function loadGraph(
  repo: CatalogRepo,
  jobIds: string[],
  chosen: string[] | null = null,
  type: CompanyType | null = null,
): Promise<GraphLoad> {
  const [industries, industryTotals, stored] = await Promise.all([repo.industries(), repo.industryCompanyCounts(), repo.storedJobLinks()]);
  const picks = Object.fromEntries(jobIds.map((j) => [j, pickIndustries(j, industryTotals, chosen)]));
  const needed = [...new Set(Object.values(picks).flat())];
  const relaxed: string[] = [];
  const tops = await Promise.all(
    needed.map(async (ind) => {
      let list = await repo.topCompanies(ind, PER_INDUSTRY, type);
      if (type && !list.length) {
        relaxed.push(ind); // nothing of that type here: show the industry unfiltered and say so
        list = await repo.topCompanies(ind, PER_INDUSTRY);
      }
      return [ind, list] as const;
    }),
  );
  const known = new Map<string, Company>();
  for (const [, list] of tops) for (const c of list) known.set(c.id, c);
  const topIds = Object.fromEntries(tops.map(([ind, list]) => [ind, list.map((c) => c.id)]));
  const ranks = Object.fromEntries(tops.flatMap(([, list]) => list.map((c, k) => [c.id, k + 1] as const)));

  const links = jobIds.flatMap((j) => starLinks(j, picks[j], topIds, stored));
  const missing = [...new Set(links.map((l) => l.companyId))].filter((id) => !known.has(id));
  for (const c of missing.length ? await repo.companiesByIds(missing) : []) known.set(c.id, c);

  // a stored link to a company outside the reviewed catalogue is not drawn
  const usable = links.filter((l) => known.has(l.companyId));
  const companies = [...known.values()];
  const segmentsByCompany = await repo.segmentsFor(companies.map((c) => c.id));
  return { industries, industryTotals, companies, links: usable, segmentsByCompany, relaxed: relaxed.sort(), ranks };
}
