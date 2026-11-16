// 나의 취업 그래프 "직무별 별자리" (specs/explore FR-MAP-03; decisions 2026-10-30, 2026-11-01, 2026-11-14).
// Pure data -> graph builder ported from prototype v1.3 (graph.jsx buildGraph), adapted to JobLink data:
// one star per liked job, each industry at the same fixed angle in every star, companies only when an
// industry is opened (saved companies always), bridges between the same industry / company across stars.
import type { Company, Industry, JobLink, JobRole } from "@/lib/contracts/domain";

export const RING = 108; // job -> industry distance
export const CO_RING = RING + 110; // job -> company distance
export const PER_IND_CAP = 8;

/**
 * Same industry sits at the same spot in every star (degrees, 0 = right, 90 = down). Only the industries on the graph
 * share the circle, evenly, in catalogue order, starting at the top, so a few industries never crowd one side.
 */
export function industryAngles(industries: Industry[]): Record<string, number> {
  const out: Record<string, number> = {};
  const step = 360 / Math.max(industries.length, 1);
  industries.forEach((ind, k) => (out[ind.id] = (270 + k * step) % 360));
  return out;
}

/** Industry circle radius from how many companies the industry has (log scale: 8 -> ~15, 400 -> ~26). */
export const industryRadius = (companies: number) => 9 + 2 * Math.log2(1 + Math.max(companies, 1));

/** Star centres: a row (2-3), two rows (4-5) or a vertical stack on narrow screens. */
export function anchors(n: number, vertical: boolean): [number, number][] {
  if (n <= 1) return [[0, 0]];
  if (vertical) {
    if (n === 2) return [[0, -170], [0, 170]];
    if (n === 3) return [[0, -320], [0, 0], [0, 320]];
    if (n === 4) return [[-140, -170], [140, -170], [-140, 170], [140, 170]];
    return [[-140, -320], [140, -320], [-140, 0], [140, 0], [0, 320]];
  }
  if (n === 2) return [[-200, 0], [200, 0]];
  if (n === 3) return [[-310, 0], [0, 0], [310, 0]];
  if (n === 4) return [[-180, -165], [180, -165], [-180, 175], [180, 175]];
  return [[-310, -165], [0, -165], [310, -165], [-155, 175], [155, 175]];
}

export type GNodeType = "center" | "ind" | "co";
export type GNode = {
  id: string;
  type: GNodeType;
  ref: string; // job id / industry id / company id
  job: string;
  label: string;
  r: number;
  tx: number;
  ty: number;
  count?: number; // industry: linked companies in this star
  postings?: number; // industry: companies with a real posting
  shared?: number; // industry: how many of my jobs hire here
  basis?: "posting" | "estimated";
  saved?: boolean;
  noData?: boolean;
  expanded?: boolean;
};
export type GLink = { source: string; target: string; kind: "job-ind" | "ind-co" | "ind-co-est"; w: number };
export type GBridge = { source: string; target: string; ref: string; sign: 1 | -1 };
export type GraphData = { nodes: GNode[]; links: GLink[]; bridges: GBridge[] };

type Input = {
  jobs: JobRole[]; // stars, in order (max 5)
  industries: Industry[];
  companies: Company[];
  links: JobLink[]; // links for all star jobs
  /** reviewed companies per industry (the industry circle size and its count); defaults to the star's own links */
  totals?: Record<string, number>;
  saved: string[];
  expanded: string | null; // "jobId|industryId"
  vertical: boolean;
};

const rad = (deg: number) => (deg * Math.PI) / 180;

export function buildGraph(i: Input): GraphData {
  const jobs = i.jobs.slice(0, 5);
  const coById = new Map(i.companies.map((c) => [c.id, c]));
  const maxRev = Math.max(1, ...i.companies.map((c) => c.revenue ?? 0));
  const [exJob, exInd] = i.expanded ? i.expanded.split("|") : [null, null];

  // industries per job
  const jobInds = new Map<string, Map<string, JobLink[]>>();
  for (const j of jobs) {
    const m = new Map<string, JobLink[]>();
    for (const l of i.links.filter((x) => x.jobRoleId === j.id)) {
      const c = coById.get(l.companyId);
      if (!c) continue;
      m.set(c.industryId, [...(m.get(c.industryId) ?? []), l]);
    }
    jobInds.set(j.id, m);
  }
  const shareCount: Record<string, number> = {};
  for (const m of jobInds.values()) for (const ind of m.keys()) shareCount[ind] = (shareCount[ind] ?? 0) + 1;
  const angles = industryAngles(i.industries.filter((ind) => shareCount[ind.id]));

  const nodes: GNode[] = [];
  const links: GLink[] = [];
  const bridges: GBridge[] = [];
  const A = anchors(jobs.length, i.vertical);

  jobs.forEach((j, k) => {
    const [cx, cy] = A[k];
    nodes.push({ id: `job:${j.id}`, type: "center", ref: j.id, job: j.id, label: j.name, r: 22, tx: cx, ty: cy });
    for (const ind of i.industries) {
      const ls = jobInds.get(j.id)?.get(ind.id);
      if (!ls?.length) continue;
      const ang = rad(angles[ind.id]);
      const id = `ind:${j.id}:${ind.id}`;
      const postings = ls.filter((l) => l.basis === "posting").length;
      const isEx = exJob === j.id && exInd === ind.id;
      const count = Math.max(i.totals?.[ind.id] ?? 0, ls.length);
      nodes.push({
        id, type: "ind", ref: ind.id, job: j.id, label: ind.name, count, postings, shared: shareCount[ind.id],
        r: industryRadius(count), tx: cx + Math.cos(ang) * RING, ty: cy + Math.sin(ang) * RING, expanded: isEx,
      });
      // one thin line style for every link (D 2026-11-17): evidence is told in words on the cards, not by line weight
      links.push({ source: `job:${j.id}`, target: id, kind: "job-ind", w: 1 });

      // saved companies always; the opened industry adds the rest (biggest first)
      const ordered = [...ls].sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1));
      const show = ordered.filter((l, idx) => i.saved.includes(l.companyId) || (isEx && idx < PER_IND_CAP));
      show.forEach((l, s, arr) => {
        const c = coById.get(l.companyId)!;
        const spread = (s - (arr.length - 1) / 2) * 0.42;
        const noData = c.revenue == null;
        nodes.push({
          id: `co:${j.id}:${c.id}`, type: "co", ref: c.id, job: j.id, label: c.name, basis: l.basis, saved: i.saved.includes(c.id), noData,
          r: noData ? 7 : 6 + 8 * Math.sqrt((c.revenue ?? 0) / maxRev),
          tx: cx + Math.cos(ang + spread) * CO_RING, ty: cy + Math.sin(ang + spread) * CO_RING,
        });
        links.push({ source: id, target: `co:${j.id}:${c.id}`, kind: l.basis === "posting" ? "ind-co" : "ind-co-est", w: 1 });
      });
    }
  });

  // bridges between the same industry in different stars (shown on hover / selection)
  for (const ind of i.industries) {
    const holders = jobs.filter((j) => jobInds.get(j.id)?.has(ind.id));
    const sign = Math.sin(rad(angles[ind.id])) >= 0 ? 1 : -1;
    for (let a = 0; a < holders.length; a++)
      for (let b = a + 1; b < holders.length; b++)
        bridges.push({ source: `ind:${holders[a].id}:${ind.id}`, target: `ind:${holders[b].id}:${ind.id}`, ref: ind.id, sign });
  }
  // the same company in several stars
  const coStars = new Map<string, string[]>();
  for (const n of nodes) if (n.type === "co") coStars.set(n.ref, [...(coStars.get(n.ref) ?? []), n.id]);
  for (const [co, ids] of coStars) {
    const c = coById.get(co)!;
    const sign = Math.sin(rad(angles[c.industryId])) >= 0 ? 1 : -1;
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) bridges.push({ source: ids[a], target: ids[b], ref: `co:${co}`, sign });
  }
  return { nodes, links, bridges };
}

/** Which nodes light up together on hover (prototype v1.3 groupOf). */
export function groupOf(d: GNode, nodes: GNode[], companyIndustry: (companyId: string) => string): Set<string> {
  const set = new Set([d.id]);
  if (d.type === "ind") {
    for (const n of nodes) if (n.type === "ind" && n.ref === d.ref) { set.add(n.id); set.add(`job:${n.job}`); }
    for (const n of nodes) if (n.type === "co" && n.job === d.job && companyIndustry(n.ref) === d.ref) set.add(n.id);
  } else if (d.type === "center") {
    for (const n of nodes) if (n.job === d.job) set.add(n.id);
  } else {
    for (const n of nodes)
      if (n.type === "co" && n.ref === d.ref) { set.add(n.id); set.add(`ind:${n.job}:${companyIndustry(d.ref)}`); set.add(`job:${n.job}`); }
  }
  return set;
}
