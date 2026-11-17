// 나의 취업 그래프 "직무별 별자리" (specs/explore FR-MAP-03; decisions 2026-10-30, 2026-11-01, 2026-11-14, 2026-11-17).
// Pure data -> graph builder ported from prototype v1.3 (graph.jsx buildGraph), adapted to JobLink data.
// Layout (D 2026-11-17, the user's sketch): with several stars, each star fans its industries out on the side away from the
// other stars (same order in every star); a star alone keeps a full ring. Companies appear only when an industry is opened
// (saved companies always), as a compact block right behind their industry, so the industry and its companies stay one
// plane. Opening an industry dims the other industries of that star and moves nothing, except that a star whose opened
// industry sits at the end of a wide fan turns just enough to keep the block clear of other stars (fanTurn). Nothing links one star to another
// (D 2026-11-17: no shared-industry tag, no cross-star line). Coordinates are final: the engine does not rescale them.
import type { Company, Industry, JobLink, JobRole } from "@/lib/contracts/domain";

export const RING = 150; // job -> industry distance on a full ring (one star)
export const FAN_RING = 175; // job -> industry distance on an outward fan (several stars)
export const FAN_MAX = 250; // widest fan (deg)
export const FAN_STEP = 60; // widest gap between neighbouring industries on a fan (deg)
export const STAGGER = 34; // every second industry sits this much further out when neighbours would be closer than MIN_ARC
const MIN_ARC = 100;
export const PER_IND_CAP = 8;
// Company block behind an industry: a typical company (circle + caption) needs ~96 x 84 including the gap.
const CO_W = 96;
const CO_H = 84;

/** Full ring: industries evenly in catalogue order, starting at the top (degrees, 0 = right, 90 = down). */
export function industryAngles(industries: Industry[]): Record<string, number> {
  const out: Record<string, number> = {};
  const step = 360 / Math.max(industries.length, 1);
  industries.forEach((ind, k) => (out[ind.id] = (270 + k * step) % 360));
  return out;
}

/** Industry circle radius from how many companies the industry has (log scale: 8 -> ~15, 400 -> ~26). */
export const industryRadius = (companies: number) => 9 + 2 * Math.log2(1 + Math.max(companies, 1));

/**
 * Star centres, at least ~420 apart (D 2026-11-17 "직무 간 거리가 너무 좁다"): side by side (2), a triangle with two on top
 * and one below (3, the user's sketch), a grid (4), 3 + 2 (5); stacked on narrow screens.
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
  dim?: boolean; // industry of a star whose other industry is opened: steps back
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

/** Direction (deg) in which star k fans out: away from the other stars. null = alone or boxed in (full ring). */
export function outwardAngle(k: number, centres: [number, number][]): number | null {
  if (centres.length < 2) return null;
  let vx = 0, vy = 0;
  centres.forEach(([x, y], m) => {
    if (m === k) return;
    const dx = centres[k][0] - x, dy = centres[k][1] - y, d = Math.hypot(dx, dy) || 1;
    vx += dx / d;
    vy += dy / d;
  });
  return Math.hypot(vx, vy) >= 0.4 ? mod360(deg(Math.atan2(vy, vx))) : null;
}

/** Where a star's m industries sit, in catalogue order: a fan centred on `dir`, or a full ring when dir is null. */
export function industrySlots(m: number, dir: number | null): { ang: number; d: number }[] {
  if (m === 0) return [];
  const full = dir === null;
  const step = full ? 360 / m : m > 1 ? Math.min(FAN_STEP, FAN_MAX / (m - 1)) : 0;
  const R = full ? RING : FAN_RING;
  const start = full ? 270 : dir - (step * (m - 1)) / 2;
  const tight = m > 2 && rad(step) * R < MIN_ARC;
  return Array.from({ length: m }, (_, s) => ({ ang: mod360(start + s * step), d: R + (tight && s % 2 ? STAGGER : 0) }));
}

/**
 * Offsets (from the industry) of n companies in a compact block right behind it, seen from its job (angle `theta`):
 * rows of 2, 3, 3 ... going outward, biggest first; inside a row left to right (top to bottom on an upright row).
 * Spacing follows the direction so a company's circle + caption never overlaps its neighbour's.
 */
export function companySlots(n: number, theta: number): { dx: number; dy: number }[] {
  const ux = Math.cos(rad(theta)), uy = Math.sin(rad(theta));
  const vx = -uy, vy = ux;
  const gap = (x: number, y: number) => Math.min(CO_W / Math.max(Math.abs(x), 1e-3), CO_H / Math.max(Math.abs(y), 1e-3));
  const D = gap(ux, uy), L = gap(vx, vy);
  const out: { dx: number; dy: number }[] = [];
  for (let left = n, row = 0; left > 0; row++) {
    const c = Math.min(row === 0 ? 2 : 3, left);
    const depth = D * (row + 1) + 16;
    const cells = Array.from({ length: c }, (_, k) => {
      const lat = (k - (c - 1) / 2) * L;
      return { dx: ux * depth + vx * lat, dy: uy * depth + vy * lat };
    });
    cells.sort((a, b) => (Math.abs(vx) >= Math.abs(vy) ? a.dx - b.dx : a.dy - b.dy));
    out.push(...cells);
    left -= c;
  }
  return out;
}

/**
 * How far (deg) a star's fan turns when one of its industries opens. The company block always sits straight behind the
 * industry (the user's sketch). Near the end of a wide fan "behind" can point at a neighbouring star; then the whole fan of
 * that star turns, step by step toward its outward direction, just until every company is clearly nearer its own job than
 * any other (D 2026-11-17). 0 when the block is already clear, which is the usual case.
 */
export function fanTurn(slot: { ang: number; d: number }, dir: number, n: number, k: number, centres: [number, number][]): number {
  if (centres.length < 2 || n === 0) return 0;
  const [cx, cy] = centres[k];
  const delta = ((dir - slot.ang + 540) % 360) - 180;
  const clear = (a: number) => {
    const ix = cx + Math.cos(rad(a)) * slot.d, iy = cy + Math.sin(rad(a)) * slot.d;
    return companySlots(n, a).every(({ dx, dy }) => {
      const x = ix + dx, y = iy + dy, own = Math.hypot(x - cx, y - cy);
      return centres.every(([ox, oy], m) => m === k || Math.hypot(x - ox, y - oy) > own + 80);
    });
  };
  for (let s = 0; s <= 10; s++) if (clear(slot.ang + (delta * s) / 10)) return (delta * s) / 10;
  return delta;
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

  const nodes: GNode[] = [];
  const links: GLink[] = [];
  const A = anchors(jobs.length, i.vertical);
  // saved companies always; an opened industry adds the rest (biggest first)
  const shown = (ls: JobLink[], open: boolean) =>
    [...ls]
      .sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1))
      .filter((l, idx) => i.saved.includes(l.companyId) || (open && idx < PER_IND_CAP));

  jobs.forEach((j, k) => {
    const [cx, cy] = A[k];
    nodes.push({ id: `job:${j.id}`, type: "center", ref: j.id, job: j.id, label: j.name, r: 22, tx: cx, ty: cy });
    const mine = i.industries.filter((ind) => jobInds.get(j.id)?.get(ind.id)?.length);
    const dir = outwardAngle(k, A);
    const focused = exJob === j.id && mine.some((ind) => ind.id === exInd);
    const fan = industrySlots(mine.length, dir);
    const at = focused ? mine.findIndex((ind) => ind.id === exInd) : -1;
    const turn = at >= 0 && dir !== null ? fanTurn(fan[at], dir, shown(jobInds.get(j.id)!.get(exInd!)!, true).length, k, A) : 0;
    const slots = fan.map((sl) => ({ ...sl, ang: mod360(sl.ang + turn) }));
    mine.forEach((ind, s) => {
      const ls = jobInds.get(j.id)!.get(ind.id)!;
      const { ang, d } = slots[s];
      const ix = cx + Math.cos(rad(ang)) * d, iy = cy + Math.sin(rad(ang)) * d;
      const id = `ind:${j.id}:${ind.id}`;
      const postings = ls.filter((l) => l.basis === "posting").length;
      const isEx = exJob === j.id && exInd === ind.id;
      const dim = focused && !isEx;
      const count = Math.max(i.totals?.[ind.id] ?? 0, ls.length);
      nodes.push({ id, type: "ind", ref: ind.id, job: j.id, label: ind.name, count, postings, r: industryRadius(count), tx: ix, ty: iy, expanded: isEx, dim });
      // one thin line style for every link (D 2026-11-17): evidence is told in words on the cards, not by line weight
      links.push({ source: `job:${j.id}`, target: id, kind: "job-ind", w: 1, dim });

      // all of an industry's shown companies in one block straight behind it
      const show = shown(ls, isEx);
      const block = companySlots(show.length, ang);
      show.forEach((l, b) => {
        const c = coById.get(l.companyId)!;
        const noData = c.revenue == null;
        nodes.push({
          id: `co:${j.id}:${c.id}`, type: "co", ref: c.id, job: j.id, label: c.name, basis: l.basis, saved: i.saved.includes(c.id), noData,
          r: noData ? 7 : 6 + 8 * Math.sqrt((c.revenue ?? 0) / maxRev),
          tx: ix + block[b].dx, ty: iy + block[b].dy,
        });
        links.push({ source: id, target: `co:${j.id}:${c.id}`, kind: l.basis === "posting" ? "ind-co" : "ind-co-est", w: 1, dim });
      });
    });
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
