// Job map layout (specs/explore FR-MAP-03). Pure: same input -> same picture, unit-tested.
// The job sits in the centre; companies sit on two orbits (inner = real posting, outer = estimated),
// grouped into industry wedges; node size follows the latest revenue.

export type LayoutCompany = { id: string; industryId: string; revenue: number | null };
export type LayoutLink = { companyId: string; basis: "posting" | "estimated" };
export type Wedge = { industryId: string; start: number; end: number; mid: number };
export type NodePos = { id: string; x: number; y: number; size: number; angle: number; ring: "inner" | "outer"; side: "l" | "r" | "t" | "b" };

export const MAP = { w: 800, h: 620, cx: 400, cy: 310, rInner: 150, rOuter: 250, minSize: 14, maxSize: 48 } as const;

export function nodeSize(revenue: number | null, maxRevenue: number): number {
  if (revenue == null || maxRevenue <= 0) return MAP.minSize;
  return Math.round(MAP.minSize + (MAP.maxSize - MAP.minSize) * Math.sqrt(Math.max(0, revenue) / maxRevenue));
}

export function polar(r: number, deg: number, cx: number = MAP.cx, cy: number = MAP.cy): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export function labelSide(deg: number): NodePos["side"] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  if (c < -0.35) return "l";
  if (c > 0.35) return "r";
  return s < 0 ? "t" : "b";
}

/** Industry wedges sized by how many linked companies each industry has, with a gap between wedges. */
export function wedges(industryOrder: string[], counts: Record<string, number>, gap = 14, startDeg = 200): Wedge[] {
  const used = industryOrder.filter((i) => (counts[i] ?? 0) > 0);
  if (!used.length) return [];
  const total = used.reduce((s, i) => s + counts[i], 0);
  const free = 360 - gap * used.length;
  let a = startDeg;
  return used.map((industryId) => {
    const span = (free * counts[industryId]) / total;
    const w = { industryId, start: a, end: a + span, mid: a + span / 2 };
    a += span + gap;
    return w;
  });
}

/** Positions for every linked company. Inside a wedge, bigger companies go first (clockwise). */
export function layoutCompanies(companies: LayoutCompany[], links: LayoutLink[], industryOrder: string[]): { nodes: NodePos[]; wedges: Wedge[] } {
  const linked = links
    .map((l) => ({ link: l, c: companies.find((c) => c.id === l.companyId) }))
    .filter((x): x is { link: LayoutLink; c: LayoutCompany } => !!x.c);
  const counts: Record<string, number> = {};
  for (const { c } of linked) counts[c.industryId] = (counts[c.industryId] ?? 0) + 1;
  const ws = wedges(industryOrder, counts);
  const maxRev = Math.max(1, ...companies.map((c) => c.revenue ?? 0));
  const nodes: NodePos[] = [];
  for (const w of ws) {
    const inW = linked
      .filter(({ c }) => c.industryId === w.industryId)
      .sort((a, b) => (b.c.revenue ?? -1) - (a.c.revenue ?? -1) || a.c.id.localeCompare(b.c.id));
    const step = (w.end - w.start) / inW.length;
    inW.forEach(({ c, link }, k) => {
      const angle = w.start + step * (k + 0.5);
      const ring = link.basis === "posting" ? "inner" : "outer";
      const [x, y] = polar(ring === "inner" ? MAP.rInner : MAP.rOuter, angle);
      nodes.push({ id: c.id, x, y, size: nodeSize(c.revenue, maxRev), angle, ring, side: labelSide(angle) });
    });
  }
  return { nodes, wedges: ws };
}

/** Segment branches fan out behind a selected company, away from the centre. */
export function branchPositions(company: NodePos, n: number, distance = 120, spreadDeg = 34): { x: number; y: number; angle: number }[] {
  if (n <= 0) return [];
  const base = company.angle;
  const first = base - (spreadDeg * (n - 1)) / 2;
  return Array.from({ length: n }, (_, k) => {
    const angle = first + spreadDeg * k;
    const [x, y] = polar(distance, angle, company.x, company.y);
    return { x: Math.min(MAP.w - 70, Math.max(70, x)), y: Math.min(MAP.h - 30, Math.max(30, y)), angle }; // stay on the canvas
  });
}
