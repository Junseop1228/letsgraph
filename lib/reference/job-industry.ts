// 기준표 ② 직무 × 산업 관련도 (layer 1 of the job<->company links; D 2026-11-17 two-layer rule).
// Every company in an industry related to a job is an 'estimated' link for that job until a parsed JD confirms it
// ('posting', layer 2, stored in job_links). Claude draft of 2026-11-17 under the confirmed principles: a company sits
// where a job seeker would look for it, so a job is related to the industries whose companies commonly hire it.
//   2 = core: most companies in the industry hire this job for their main business
//   1 = common: many companies in the industry hire it
//   (missing) = rare: not shown for this job unless a JD confirms a company
// Ids: lib/reference/jobs.ts and the industries of industry-map.ts. Import-free so scripts can load it directly.

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

const level = (core: readonly string[], common: readonly string[] = []) => {
  const out: Record<string, Relevance> = {};
  for (const id of common) out[id] = 1;
  for (const id of core) out[id] = 2;
  return out;
};

export const JOB_INDUSTRY: Record<string, Record<string, Relevance>> = {
  // 경영지원: every industry hires them; holding companies are mostly support staff
  strategy: level(["holding"], ALL),
  finance: level(["holding", "finance"], ALL),
  hr: level(["holding", "services"], ALL),
  // 영업·마케팅
  "b2b-sales": level(
    ["semiconductor", "electronics", "battery", "machinery", "chemicals", "steel", "automotive", "it"],
    ["shipbuilding-aerospace", "energy", "bio-pharma", "construction", "logistics", "services", "food", "cosmetics"],
  ),
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
    ["electronics", "automotive", "bio-pharma", "finance", "services", "construction", "logistics"],
  ),
  merchandising: level(["retail", "fashion-living", "food", "cosmetics"], ["electronics", "media", "game"]),
  // 생산·품질
  "production-mgmt": level(MAKERS, ["energy", "construction", "fashion-living"]),
  "production-eng": level(MAKERS, ["energy", "fashion-living"]),
  "semi-process": level(["semiconductor"], ["electronics"]),
  quality: level(MAKERS, ["energy", "construction", "fashion-living"]),
  facility: level(
    ["semiconductor", "electronics", "battery", "automotive", "shipbuilding-aerospace", "chemicals", "steel", "energy", "bio-pharma"],
    ["machinery", "food", "cosmetics", "fashion-living", "construction"],
  ),
  ehs: level(
    ["chemicals", "steel", "semiconductor", "battery", "construction", "energy", "shipbuilding-aerospace"],
    ["automotive", "electronics", "machinery", "bio-pharma", "food", "cosmetics", "logistics"],
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
  "logistics-trade": level(
    ["logistics", "retail"],
    ["automotive", "electronics", "chemicals", "steel", "food", "fashion-living", "cosmetics", "battery", "semiconductor"],
  ),
  // 연구개발
  "circuit-hw": level(["electronics", "semiconductor", "automotive"], ["battery", "machinery", "shipbuilding-aerospace", "energy", "it"]),
  "mech-design": level(
    ["machinery", "automotive", "shipbuilding-aerospace", "electronics"],
    ["battery", "semiconductor", "energy", "construction", "steel"],
  ),
  "materials-rnd": level(["chemicals", "battery", "steel", "semiconductor"], ["cosmetics", "electronics", "energy", "fashion-living", "automotive"]),
  "bio-process": level(["bio-pharma"], ["food", "chemicals", "cosmetics"]),
  "food-rnd": level(["food"], ["bio-pharma", "retail"]),
  "construction-eng": level(["construction"], ["energy"]),
  // IT·데이터
  "sw-dev": level(
    ["it", "game", "finance"],
    ["electronics", "automotive", "semiconductor", "media", "retail", "logistics", "services", "machinery"],
  ),
  "service-planning": level(["it", "game", "finance", "retail"], ["media", "services", "logistics", "electronics"]),
  "data-analysis": level(
    ["it", "finance", "retail", "game"],
    ["semiconductor", "electronics", "automotive", "battery", "chemicals", "bio-pharma", "food", "cosmetics", "media", "logistics", "services", "fashion-living"],
  ),
  "data-ai-eng": level(["it", "finance", "game"], ["semiconductor", "electronics", "automotive", "retail", "media", "bio-pharma", "logistics"]),
  "erp-consulting": level(
    ["it", "services"],
    ["automotive", "electronics", "chemicals", "steel", "semiconductor", "battery", "retail", "logistics", "holding"],
  ),
  // 금융
  "finance-general": level(["finance"]),
  "investment-risk": level(["finance"], ["holding"]),
  // 디자인·콘텐츠
  uxui: level(["it", "game"], ["electronics", "finance", "retail", "media", "automotive"]),
  "game-planning": level(["game"], ["it", "media"]),
  "content-pd": level(["media"], ["it", "game", "retail", "cosmetics", "fashion-living"]),
};

/** Industries related to a job, strongest first (ties keep the industry display order of `order`). */
export function industriesForJob(jobId: string, order: readonly string[]): { industryId: string; relevance: Relevance }[] {
  const rel = JOB_INDUSTRY[jobId] ?? {};
  return order
    .filter((id) => rel[id])
    .map((id) => ({ industryId: id, relevance: rel[id] }))
    .sort((a, b) => b.relevance - a.relevance);
}
