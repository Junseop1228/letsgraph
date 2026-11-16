// Server side of 나의 취업 그래프: only the slice of the catalogue the stars can show (top N per picked industry, stored
// links, their segments), never the whole company list (specs/explore FR-MAP-03).
import "server-only";
import type { BusinessSegment, Company, Industry, JobLink } from "@/lib/contracts/domain";
import type { CatalogRepo } from "@/lib/data/repo";
import { PER_INDUSTRY, pickIndustries, starLinks } from "@/lib/explore/stars";

export type GraphLoad = {
  industries: Industry[];
  /** reviewed companies per industry */
  industryTotals: Record<string, number>;
  companies: Company[];
  links: JobLink[];
  segmentsByCompany: Record<string, BusinessSegment[]>;
};

/** Graph data for these jobs (all job cards the visitor may turn on); `chosen` = industries picked on the onboarding card. */
export async function loadGraph(repo: CatalogRepo, jobIds: string[], chosen: string[] | null = null): Promise<GraphLoad> {
  const [industries, industryTotals, stored] = await Promise.all([repo.industries(), repo.industryCompanyCounts(), repo.storedJobLinks()]);
  const picks = Object.fromEntries(jobIds.map((j) => [j, pickIndustries(j, industryTotals, chosen)]));
  const needed = [...new Set(Object.values(picks).flat())];
  const tops = await Promise.all(needed.map(async (ind) => [ind, await repo.topCompanies(ind, PER_INDUSTRY)] as const));
  const known = new Map<string, Company>();
  for (const [, list] of tops) for (const c of list) known.set(c.id, c);
  const topIds = Object.fromEntries(tops.map(([ind, list]) => [ind, list.map((c) => c.id)]));

  const links = jobIds.flatMap((j) => starLinks(j, picks[j], topIds, stored));
  const missing = [...new Set(links.map((l) => l.companyId))].filter((id) => !known.has(id));
  for (const c of missing.length ? await repo.companiesByIds(missing) : []) known.set(c.id, c);

  // a stored link to a company outside the reviewed catalogue is not drawn
  const usable = links.filter((l) => known.has(l.companyId));
  const companies = [...known.values()];
  const segmentsByCompany = await repo.segmentsFor(companies.map((c) => c.id));
  return { industries, industryTotals, companies, links: usable, segmentsByCompany };
}
