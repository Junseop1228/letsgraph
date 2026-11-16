// 기준표 ② 직무 × 산업 관련도 (layer 1 of the job<->company links; D 2026-11-17 two-layer rule).
// Every company in an industry related to a job is an 'estimated' link for that job until a parsed JD confirms it
// ('posting', layer 2, stored in job_links). Claude draft of 2026-11-17 under the confirmed principles: a company sits
// where a job seeker would look for it, so a job is related to the industries whose companies commonly hire it.
//   2 = core: most companies in the industry hire this job for their main business
//   1 = common: many companies in the industry hire it
//   (missing) = rare: not shown for this job unless a JD confirms a company
// Ids: job_roles.id (DB) and industries ids of industry-map.ts. Import-free so scripts can load it directly.

export type Relevance = 1 | 2;

/** Manufacturing industries: where production, quality, facility and purchasing jobs live. */
const MAKERS = [
  "semiconductor",
  "electronics",
  "battery",
  "automotive",
  "shipbuilding-aerospace",
  "machinery",
  "chemicals",
  "steel",
  "bio-pharma",
  "food",
  "cosmetics",
] as const;

/** Every industry (support jobs exist everywhere). */
const ALL = [
  ...MAKERS,
  "energy",
  "construction",
  "fashion-living",
  "retail",
  "logistics",
  "it",
  "game",
  "media",
  "finance",
  "holding",
  "services",
] as const;

const level = (core: readonly string[], common: readonly string[]) => {
  const out: Record<string, Relevance> = {};
  for (const id of common) out[id] = 1;
  for (const id of core) out[id] = 2;
  return out;
};

export const JOB_INDUSTRY: Record<string, Record<string, Relevance>> = {
  // 경영지원: every industry hires them; holding companies are mostly support staff
  finance: level(["holding", "finance"], ALL),
  hr: level(["holding"], ALL),
  // 생산·품질
  "production-mgmt": level(MAKERS, ["energy", "construction", "fashion-living"]),
  quality: level(MAKERS, ["energy", "construction", "fashion-living"]),
  facility: level(
    ["semiconductor", "electronics", "battery", "automotive", "shipbuilding-aerospace", "chemicals", "steel", "energy", "bio-pharma"],
    ["machinery", "food", "cosmetics", "fashion-living", "construction"],
  ),
  // 연구개발
  "food-rnd": level(["food"], ["bio-pharma", "retail"]),
  "bio-process": level(["bio-pharma"], ["food", "chemicals", "cosmetics"]),
  // 영업·마케팅
  "sales-mgmt": level(
    ["food", "cosmetics", "fashion-living", "retail", "bio-pharma"],
    ["semiconductor", "electronics", "battery", "automotive", "machinery", "chemicals", "steel", "energy", "construction", "logistics", "it", "media", "finance", "services"],
  ),
  "overseas-sales": level(
    ["semiconductor", "electronics", "battery", "automotive", "shipbuilding-aerospace", "machinery", "chemicals", "steel", "bio-pharma", "cosmetics", "retail"],
    ["food", "fashion-living", "energy", "construction", "logistics", "it", "game", "media"],
  ),
  marketing: level(
    ["food", "cosmetics", "fashion-living", "retail", "game", "media", "it"],
    ["electronics", "automotive", "bio-pharma", "finance", "services", "construction"],
  ),
  // 구매·물류
  purchasing: level(
    ["semiconductor", "electronics", "battery", "automotive", "shipbuilding-aerospace", "machinery", "chemicals", "steel", "food", "construction", "retail"],
    ["bio-pharma", "cosmetics", "fashion-living", "energy", "logistics", "services"],
  ),
  scm: level(
    ["automotive", "electronics", "food", "retail", "logistics"],
    ["semiconductor", "battery", "shipbuilding-aerospace", "machinery", "chemicals", "steel", "bio-pharma", "cosmetics", "fashion-living", "energy"],
  ),
};

/** Industries related to a job, strongest first (ties keep the industry display order of `order`). */
export function industriesForJob(jobId: string, order: readonly string[]): { industryId: string; relevance: Relevance }[] {
  const rel = JOB_INDUSTRY[jobId] ?? {};
  return order
    .filter((id) => rel[id])
    .map((id) => ({ industryId: id, relevance: rel[id] }))
    .sort((a, b) => b.relevance - a.relevance);
}
