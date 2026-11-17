// 나의 취업 그래프 "직무별 별자리" (specs/explore FR-MAP-03; decisions 2026-10-30, 2026-11-01, 2026-11-14).
// Pure data -> graph builder ported from prototype v1.3 (graph.jsx buildGraph), adapted to JobLink data:
// one star per liked job, each industry at the same fixed angle in every star, companies only when an
// industry is opened (saved companies always). Nothing links one star to another (D 2026-11-17: no shared-industry tag, no cross-star line).
import type { Company, Industry, JobLink, JobRole } from "@/lib/contracts/domain";

export const RING = 108; // job -> industry distance
export const CO_RING = RING + 110; // job -> company distance
export const PER_IND_CAP = 8;

// Focus layout of a star with an opened industry (D 2026-11-17, option 나): the opened industry points away from the other
// stars and gets a wide free sector for its companies; the other industries of that star dim and bunch up opposite.
export const FOCUS_GAP = 66; // half-width (deg) of the sector kept free around the opened industry
export const CO_STEP = 20; // deg between neighbouring companies on the fan (arc ~100px at the company ring, a label's height)
export const CO_STAGGER = 40; // every second company sits this much further out, so labels never touch

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

/**
 * Star centres, at least ~420 apart (a star with its labels is ~390 wide, so two never touch; D 2026-11-17 "직무 간 거리가 너무 좁다"):
 * side by side (2), a triangle (3), a grid (4), 3 + 2 (5); stacked on narrow screens.
 */
export function anchors(n: number, vertical: boolean): [number, number][] {
  if (n <= 1) return [[0, 0]];
  if (vertical) {
    if (n === 2) return [[0, -230], [0, 230]];
    if (n === 3) return [[0, -440], [0, 0], [0, 440]];
    if (n === 4) return [[-210, -230], [210, -230], [-210, 230], [210, 230]];
    return [[-210, -440], [210, -440], [-210, 0], [210, 0], [0, 440]];
  }
  if (n === 2) return [[-290, 0], [290, 0]];
  if (n === 3) return [[-270, -210], [270, -210], [0, 250]];
  if (n === 4) return [[-270, -215], [270, -215], [-270, 215], [270, 215]];
  return [[-450, -215], [0, -215], [450, -215], [-225, 225], [225, 225]];
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
  basis?: "posting" | "estimated";
  saved?: boolean;
  noData?: boolean;
  expanded?: boolean;
  dim?: boolean; // industry of a star whose other industry is opened: pushed back
};
export type GLink = { source: string; target: string; kind: "job-ind" | "ind-co" | "ind-co-est"; w: number; dim?: boolean };
export type GraphData = { nodes: GNode[]; links: GLink[] };

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

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const mod360 = (a: number) => ((a % 360) + 360) % 360;
const apart = (a: number, b: number) => {
  const d = Math.abs(mod360(a) - mod360(b));
  return d > 180 ? 360 - d : d;
};

/**
 * Direction (deg, 0 = right, 90 = down) in which star k unfolds an industry: away from the other stars, so the fan never
 * runs into a neighbour. Alone it keeps the industry's own angle; boxed in (middle of a row or column) it opens sideways.
 */
export function focusAngle(k: number, centres: [number, number][], own: number): number {
  if (centres.length < 2) return own;
  let vx = 0, vy = 0;
  centres.forEach(([x, y], m) => {
    if (m === k) return;
    const dx = centres[k][0] - x, dy = centres[k][1] - y, d = Math.hypot(dx, dy) || 1;
    vx += dx / d;
    vy += dy / d;
  });
  if (Math.hypot(vx, vy) >= 0.4) return mod360(deg(Math.atan2(vy, vx)));
  const first = centres[k === 0 ? 1 : 0];
  const toward = deg(Math.atan2(first[1] - centres[k][1], first[0] - centres[k][0]));
  const sides = [mod360(toward + 90), mod360(toward - 90)];
  return sides.sort((a, b) => apart(a, own) - apart(b, own))[0];
}

/** Angles of one star's industries in focus: the opened one at `phi`, the others in their old order on the far side. */
export function focusAngles(ids: string[], natural: Record<string, number>, opened: string, phi: number): Record<string, number> {
  const out: Record<string, number> = { [opened]: phi };
  const rel = (id: string) => mod360(natural[id] - natural[opened]);
  const others = ids.filter((id) => id !== opened).sort((a, b) => rel(a) - rel(b));
  const m = others.length;
  const span = Math.min(360 - 2 * FOCUS_GAP, Math.max(m - 1, 0) * 40);
  others.forEach((id, s) => (out[id] = mod360(phi + 180 - span / 2 + (m > 1 ? (s * span) / (m - 1) : 0))));
  return out;
}

/** Places for n companies on the fan around `phi`: reading order top to bottom (left to right when it points up or down), every second one further out. */
export function fanSlots(n: number, phi: number): { ang: number; out: number }[] {
  const step = Math.min(CO_STEP, 180 / Math.max(n, 1));
  let angs = Array.from({ length: n }, (_, s) => phi + (s - (n - 1) / 2) * step);
  const key = (a: number) => (Math.abs(Math.cos(rad(phi))) >= Math.abs(Math.sin(rad(phi))) ? Math.sin(rad(a)) : Math.cos(rad(a)));
  if (n > 1 && key(angs[0]) > key(angs[n - 1])) angs = angs.reverse();
  return angs.map((ang, s) => ({ ang, out: s % 2 ? CO_STAGGER : 0 }));
}

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
  const present = new Set<string>();
  for (const m of jobInds.values()) for (const ind of m.keys()) present.add(ind);
  const angles = industryAngles(i.industries.filter((ind) => present.has(ind.id)));

  const nodes: GNode[] = [];
  const links: GLink[] = [];
  const A = anchors(jobs.length, i.vertical);

  jobs.forEach((j, k) => {
    const [cx, cy] = A[k];
    nodes.push({ id: `job:${j.id}`, type: "center", ref: j.id, job: j.id, label: j.name, r: 22, tx: cx, ty: cy });
    // focus (option 나): this star has an opened industry -> it points outward, the others dim and bunch up opposite
    const starInds = i.industries.filter((ind) => jobInds.get(j.id)?.get(ind.id)?.length).map((ind) => ind.id);
    const focused = exJob === j.id && exInd !== null && starInds.includes(exInd);
    const phi = focused ? focusAngle(k, A, angles[exInd!]) : 0;
    const placed = focused ? focusAngles(starInds, angles, exInd!, phi) : angles;
    for (const ind of i.industries) {
      const ls = jobInds.get(j.id)?.get(ind.id);
      if (!ls?.length) continue;
      const ang = rad(placed[ind.id]);
      const id = `ind:${j.id}:${ind.id}`;
      const postings = ls.filter((l) => l.basis === "posting").length;
      const isEx = exJob === j.id && exInd === ind.id;
      const dim = focused && !isEx;
      const count = Math.max(i.totals?.[ind.id] ?? 0, ls.length);
      nodes.push({
        id, type: "ind", ref: ind.id, job: j.id, label: ind.name, count, postings,
        r: industryRadius(count), tx: cx + Math.cos(ang) * RING, ty: cy + Math.sin(ang) * RING, expanded: isEx, dim,
      });
      // one thin line style for every link (D 2026-11-17): evidence is told in words on the cards, not by line weight
      links.push({ source: `job:${j.id}`, target: id, kind: "job-ind", w: 1, dim });

      // saved companies always; the opened industry adds the rest (biggest first)
      const ordered = [...ls].sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1));
      const show = ordered.filter((l, idx) => i.saved.includes(l.companyId) || (isEx && idx < PER_IND_CAP));
      const fan = isEx ? fanSlots(show.length, phi) : null; // the opened industry's companies share the free sector
      show.forEach((l, s, arr) => {
        const c = coById.get(l.companyId)!;
        const spread = (s - (arr.length - 1) / 2) * 0.42;
        const at = fan ? { a: rad(fan[s].ang), d: CO_RING + fan[s].out } : { a: ang + spread, d: CO_RING };
        const noData = c.revenue == null;
        nodes.push({
          id: `co:${j.id}:${c.id}`, type: "co", ref: c.id, job: j.id, label: c.name, basis: l.basis, saved: i.saved.includes(c.id), noData,
          r: noData ? 7 : 6 + 8 * Math.sqrt((c.revenue ?? 0) / maxRev),
          tx: cx + Math.cos(at.a) * at.d, ty: cy + Math.sin(at.a) * at.d,
        });
        links.push({ source: id, target: `co:${j.id}:${c.id}`, kind: l.basis === "posting" ? "ind-co" : "ind-co-est", w: 1, dim });
      });
    }
  });

  return { nodes, links };
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
