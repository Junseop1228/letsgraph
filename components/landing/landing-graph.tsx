"use client";
// 첫 화면의 예시 그래프 (D 2026-11-18 landing option 나): what 탐색 does, as a small live graph. On load it plays once
// (the job appears, industries come out, 식품 opens with its companies on a gray plane while the rest dims), then it is
// a toy: the dots ripple around the pointer like water and settle back when it leaves (d3-force with a pointer force,
// user 2026-11-18 "마우스 올려놨을 때 그래프 점들이 일렁이는 이펙트"), hovering a node lights up what it is joined to, and
// a click (or Enter) on an industry opens it (specs/explore FR-MAP-03 moves). Shapes and lines are one SVG that scales
// with the box; labels are HTML on top so they stay 12-13px on any screen. Reduced motion: no intro and no ripple, nodes
// jump to their places. Company sizes are illustrative (the caption says it is an example).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { forceCollide, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { Atom, Car, Cpu, FlaskConical, SprayCan, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const W = 440;
const H = 380;
const J = { x: 200, y: 190 };
const RING = 96;
const JOB_R = 40;
const IND_R = 22;
const OPEN_AT = 1400; // ms into the intro when 식품 opens
const JOB = "job";
// the ripple around the pointer (viewBox units, per tick): reach, push away, wave height, wave length, wave speed
const RIPPLE = { reach: 120, push: 1.1, wave: 0.9, length: 16, speed: 5 };

type Company = { name: string; r: number };
type Industry = { id: string; name: string; icon: LucideIcon; angle: number; companies: Company[] };
// same icons as the real graph (components/explore/industry-icon.tsx)
const INDUSTRIES: Industry[] = [
  { id: "food", name: "식품", icon: UtensilsCrossed, angle: 0, companies: [{ name: "CJ제일제당", r: 20 }, { name: "농심", r: 16 }, { name: "오뚜기", r: 14 }, { name: "대상", r: 13 }, { name: "동원F&B", r: 12 }] },
  { id: "bio", name: "바이오·제약", icon: FlaskConical, angle: 55, companies: [{ name: "셀트리온", r: 17 }, { name: "유한양행", r: 13 }, { name: "한미약품", r: 12 }] },
  { id: "cosmetics", name: "화장품", icon: SprayCan, angle: 125, companies: [{ name: "LG생활건강", r: 17 }, { name: "아모레퍼시픽", r: 16 }, { name: "코스맥스", r: 12 }] },
  { id: "chemicals", name: "화학", icon: Atom, angle: 180, companies: [{ name: "LG화학", r: 20 }, { name: "롯데케미칼", r: 17 }, { name: "한화솔루션", r: 15 }] },
  { id: "semiconductor", name: "반도체", icon: Cpu, angle: 235, companies: [{ name: "삼성전자", r: 22 }, { name: "SK하이닉스", r: 19 }, { name: "DB하이텍", r: 11 }] },
  { id: "automotive", name: "자동차", icon: Car, angle: 305, companies: [{ name: "현대자동차", r: 21 }, { name: "기아", r: 20 }, { name: "현대모비스", r: 16 }] },
];
const BY_ID = new Map(INDUSTRIES.map((i) => [i.id, i]));
// companies sit just behind their industry, seen from the job: [distance out, distance sideways]
const SLOTS: Record<number, [number, number][]> = {
  3: [[66, -40], [74, 0], [66, 40]],
  5: [[64, -46], [70, 0], [64, 46], [110, -24], [110, 24]],
};

type Pos = { x: number; y: number };
type Kind = "job" | "industry" | "company";
type Node = SimulationNodeDatum & { id: string; kind: Kind; r: number; tx: number; ty: number; parent?: string };

const rad = (deg: number) => (deg * Math.PI) / 180;
const keep = (p: Pos, r: number): Pos => ({ x: Math.min(W - r - 2, Math.max(r + 2, p.x)), y: Math.min(H - r - 2, Math.max(r + 2, p.y)) });
const coId = (ind: string, k: number) => `${ind}:${k}`;

function industryAt(ind: Industry): Pos {
  return { x: J.x + RING * Math.cos(rad(ind.angle)), y: J.y - RING * Math.sin(rad(ind.angle)) };
}
function companiesAt(ind: Industry): Pos[] {
  const p = industryAt(ind);
  const u = { x: Math.cos(rad(ind.angle)), y: -Math.sin(rad(ind.angle)) };
  const v = { x: -u.y, y: u.x };
  return ind.companies.map((c, k) => {
    const [d, s] = SLOTS[ind.companies.length][k];
    return keep({ x: p.x + u.x * d + v.x * s, y: p.y + u.y * d + v.y * s }, c.r);
  });
}
/** where every visible node wants to be, for a given open industry */
function targets(open: string | null): Map<string, { pos: Pos; r: number; kind: Kind; parent?: string }> {
  const m = new Map<string, { pos: Pos; r: number; kind: Kind; parent?: string }>();
  m.set(JOB, { pos: J, r: JOB_R, kind: "job" });
  for (const ind of INDUSTRIES) m.set(ind.id, { pos: industryAt(ind), r: IND_R, kind: "industry" });
  const o = open ? BY_ID.get(open) : undefined;
  if (o) companiesAt(o).forEach((pos, k) => m.set(coId(o.id, k), { pos, r: o.companies[k].r, kind: "company", parent: o.id }));
  return m;
}

/** a rounded hull around circles: the gray plane behind an open industry and its companies */
function planePath(circles: { x: number; y: number; r: number }[]): string {
  const pts: [number, number][] = [];
  for (const c of circles) for (let k = 0; k < 12; k++) pts.push([c.x + (c.r + 14) * Math.cos((k * Math.PI) / 6), c.y + (c.r + 14) * Math.sin((k * Math.PI) / 6)]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  if (hull.length < 3) return "";
  const mid = (a: [number, number], b: [number, number]) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let d = `M ${mid(hull[hull.length - 1], hull[0])}`;
  hull.forEach((p, k) => (d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, hull[(k + 1) % hull.length])}`));
  return `${d} Z`;
}

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const m = window.matchMedia(REDUCE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

// Labels: each name goes on the side of its node where it hits nothing (below, above, right, left), chosen once per open
// industry and screen width from the resting layout, so names do not hop around while the dots ripple.
type Side = "below" | "above" | "right" | "left";
const SIDES: Side[] = ["below", "above", "right", "left"];
type Box = { l: number; t: number; r: number; b: number };
/** rough label width in px: Hangul ~1em, capitals ~0.66em, other Latin and digits ~0.56em, the middle dot less */
const textPx = (s: string, fs: number) =>
  [...s].reduce((w, ch) => w + fs * (/[\u3131-\uD79D]/.test(ch) ? 0.96 : /[A-Z&]/.test(ch) ? 0.66 : /[·\s]/.test(ch) ? 0.32 : 0.56), 0);
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
/** where a label of w x h (viewBox units) sits on one side of a node; above/below slide inside the frame */
function labelBox(side: Side, p: Pos, r: number, w: number, h: number): Box {
  if (side === "right") return { l: p.x + r + 4, t: p.y - h / 2, r: p.x + r + 4 + w, b: p.y + h / 2 };
  if (side === "left") return { l: p.x - r - 4 - w, t: p.y - h / 2, r: p.x - r - 4, b: p.y + h / 2 };
  const cx = Math.min(W - 2 - w / 2, Math.max(2 + w / 2, p.x));
  const t = side === "below" ? p.y + r + 3 : p.y - r - 3 - h;
  return { l: cx - w / 2, t, r: cx + w / 2, b: t + h };
}
function placeLabels(want: ReturnType<typeof targets>, names: Map<string, string>, open: string | null, scale: number, fs: number): Map<string, Side> {
  const h = 16 / scale;
  const circles = [...want].map(([id, t]) => ({ id, box: { l: t.pos.x - t.r, t: t.pos.y - t.r, r: t.pos.x + t.r, b: t.pos.y + t.r } }));
  const placed: Box[] = [];
  const order = [...want.keys()]
    .filter((id) => id !== JOB)
    .sort((a, b) => (a === open ? -1 : b === open ? 1 : 0) || Number(want.get(b)!.kind === "company") - Number(want.get(a)!.kind === "company") || want.get(b)!.r - want.get(a)!.r);
  const out = new Map<string, Side>();
  for (const id of order) {
    const t = want.get(id)!;
    const r = id === open ? IND_R + 7 : t.r;
    const w = textPx(names.get(id) ?? "", fs) / scale + 2;
    let best: { side: Side; cost: number; box: Box } | null = null;
    for (const [k, side] of SIDES.entries()) {
      const box = labelBox(side, t.pos, r, w, h);
      const outside = box.l < 1 || box.r > W - 1 || box.t < 1 || box.b > H - 1 ? 1e6 : 0;
      const hits = placed.reduce((s, q) => s + overlap(box, q), 0) + circles.reduce((s, c) => s + (c.id === id ? 0 : overlap(box, c.box)), 0);
      const cost = outside + hits * 10 + k;
      if (!best || cost < best.cost) best = { side, cost, box };
    }
    out.set(id, best!.side);
    placed.push(best!.box);
  }
  return out;
}

export function LandingGraph() {
  const reduce = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);
  const [open, setOpen] = useState<string | null>("food");
  const [interacted, setInteracted] = useState(false); // after the first click the intro delays are gone
  const [intro, setIntro] = useState(true); // nothing dims until 식품 has opened in the intro
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<Simulation<Node, undefined> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const pointer = useRef<Pos | null>(null); // where the pointer is over the box, in viewBox units
  const boxRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ px: 600, fs: 13 }); // rendered width of the box and the label size (styles/landing.css)

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrame({ px: e.contentRect.width, fs: window.innerWidth >= 1024 ? 13 : 12 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const want = useMemo(() => targets(open), [open]);
  // a node with no simulated position yet sits at its place, or (a company that just came out) on its industry
  const at = (id: string): Pos => {
    const p = pos[id];
    if (p) return p;
    const t = want.get(id)!;
    return t.parent && interacted && !reduce ? (pos[t.parent] ?? want.get(t.parent)!.pos) : t.pos;
  };

  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), reduce ? 0 : OPEN_AT);
    return () => window.clearTimeout(t);
  }, [reduce]);

  // one simulation for the life of the figure; its node list follows the open industry
  useEffect(() => {
    const before = new Map(nodesRef.current.map((n) => [n.id, n]));
    const nodes: Node[] = [...want].map(([id, t]) => {
      const old = before.get(id);
      const parent = t.parent ? before.get(t.parent) : undefined;
      const start = old ? { x: old.x!, y: old.y! } : parent && interacted && !reduce ? { x: parent.x!, y: parent.y! } : t.pos;
      return { id, kind: t.kind, r: t.r, tx: t.pos.x, ty: t.pos.y, parent: t.parent, x: start.x, y: start.y, vx: 0, vy: 0 };
    });
    nodesRef.current = nodes;
    let sim = simRef.current;
    if (!sim) {
      sim = forceSimulation<Node>()
        .velocityDecay(0.35)
        .alphaDecay(0.045)
        .force("x", forceX<Node>((d) => d.tx).strength(0.14))
        .force("y", forceY<Node>((d) => d.ty).strength(0.14))
        .force("collide", forceCollide<Node>((d) => d.r + (d.kind === "company" ? 12 : 8)).strength(0.8))
        // dots near the pointer are pushed out a little and bob on a ring wave that runs outward from it
        .force("ripple", () => {
          const p = pointer.current;
          if (!p) return;
          const t = performance.now() / 1000;
          for (const n of nodesRef.current) {
            const dx = n.x! - p.x;
            const dy = n.y! - p.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d > RIPPLE.reach) continue;
            const f = (1 - d / RIPPLE.reach) ** 2;
            const k = f * (RIPPLE.push + RIPPLE.wave * Math.sin(d / RIPPLE.length - t * RIPPLE.speed));
            n.vx! += (dx / d) * k;
            n.vy! += (dy / d) * k;
          }
        })
        .on("tick", () => {
          const next: Record<string, Pos> = {};
          for (const n of nodesRef.current) {
            const k = keep({ x: n.x!, y: n.y! }, n.r);
            n.x = k.x;
            n.y = k.y;
            next[n.id] = k;
          }
          setPos(next);
        });
      sim.stop();
      simRef.current = sim;
    }
    sim.nodes(nodes);
    // before the first click (intro) and with reduced motion nothing moves: nodes sit at their places, and a node
    // without a simulated position is drawn at its place too (at())
    if (interacted && !reduce) sim.alpha(0.9).restart();
    else for (const n of nodes) Object.assign(n, { x: n.tx, y: n.ty });
    return () => void sim.stop();
  }, [want, interacted, reduce]);

  function toggle(id: string) {
    setInteracted(true);
    setIntro(false);
    // companies of the industry that closes are gone; ones that come out start on their industry (at())
    setPos((s) => Object.fromEntries(Object.entries(s).filter(([k]) => !k.includes(":"))));
    setOpen((o) => (o === id ? null : id));
  }

  // the ripple keeps the simulation warm while the pointer is over the box; leaving lets everything settle back
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const m = svgRef.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const first = !pointer.current;
    pointer.current = { x: p.x, y: p.y };
    if (first) simRef.current?.alphaTarget(0.12).restart();
  }
  function onPointerLeave() {
    if (!pointer.current) return;
    pointer.current = null;
    // enough heat for the target pull to bring every dot all the way home
    simRef.current?.alphaTarget(0).alpha(0.6).restart();
  }
  function onKey(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(id);
    }
  }

  // what is lit: the hovered node and what it is joined to; else the open industry with its job and companies
  const lit = useMemo(() => {
    const companiesOf = (ind: string) => [...want.keys()].filter((id) => want.get(id)!.parent === ind);
    if (hover) {
      const t = want.get(hover);
      if (!t) return null;
      if (t.kind === "job") return new Set([JOB, ...INDUSTRIES.map((i) => i.id)]);
      if (t.kind === "industry") return new Set([JOB, hover, ...companiesOf(hover)]);
      return new Set([JOB, hover, t.parent!]);
    }
    if (open && !intro) return new Set([JOB, open, ...companiesOf(open)]);
    return null;
  }, [hover, open, intro, want]);
  const dim = (id: string) => !!lit && !lit.has(id);

  const names = useMemo(() => {
    const m = new Map<string, string>(INDUSTRIES.map((i) => [i.id, i.name]));
    for (const i of INDUSTRIES) i.companies.forEach((c, k) => m.set(coId(i.id, k), c.name));
    return m;
  }, []);
  const sides = useMemo(() => placeLabels(want, names, open, frame.px / W, frame.fs), [want, names, open, frame]);
  const labelW = (id: string) => textPx(names.get(id) ?? "", frame.fs) / (frame.px / W) + 2;
  const labelH = 16 / (frame.px / W);

  const opened = open ? BY_ID.get(open) : undefined;
  const companies = opened ? opened.companies.map((c, k) => ({ ...c, id: coId(opened.id, k), k })) : [];
  const job = at(JOB);
  const openAt = opened ? at(opened.id) : null;
  const plane = opened ? planePath([{ ...openAt!, r: IND_R }, ...companies.map((c) => ({ ...at(c.id), r: c.r }))]) : "";
  // first render: the intro timing; after a click: right away
  const t0 = interacted ? 0 : OPEN_AT;

  return (
    <figure className="w-full space-y-3">
      <div ref={boxRef} className="lp-canvas relative aspect-22/19 w-full overflow-hidden rounded-container" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" role="group" aria-label="예시 그래프: 품질관리 직무와 이어진 산업과 기업">
          {opened ? <path key={`plane-${opened.id}`} className="lp-plane lp-fade" d={plane} style={delay(t0 + 50)} aria-hidden /> : null}
          {INDUSTRIES.map((ind, k) => {
            const p = at(ind.id);
            return <line key={ind.id} className={cn("lp-edge", dim(ind.id) && "is-dim")} x1={job.x} y1={job.y} x2={p.x} y2={p.y} pathLength={1} style={delay(250 + k * 70)} aria-hidden />;
          })}
          {companies.map((c) => {
            const p = at(c.id);
            return <line key={c.id} className={cn("lp-edge", dim(c.id) && "is-dim")} x1={openAt!.x} y1={openAt!.y} x2={p.x} y2={p.y} pathLength={1} style={delay(t0 + 150 + c.k * 60)} aria-hidden />;
          })}
          <g className={cn("lp-node", dim(JOB) && "is-dim")} onPointerEnter={() => setHover(JOB)} onPointerLeave={() => setHover(null)} aria-hidden>
            <g className="lp-pop" style={delay(0)}>
              <circle className="lp-job" cx={job.x} cy={job.y} r={JOB_R} />
            </g>
          </g>
          {opened ? <circle key={`ring-${opened.id}`} className="lp-open lp-fade" cx={openAt!.x} cy={openAt!.y} r={IND_R + 6} style={delay(t0)} aria-hidden /> : null}
          {INDUSTRIES.map((ind, k) => {
            const p = at(ind.id);
            const isOpen = ind.id === open;
            return (
              <g
                key={ind.id}
                role="button"
                tabIndex={0}
                aria-label={`${ind.name} 산업 ${isOpen ? "접기" : "열기"}`}
                aria-pressed={isOpen}
                className={cn("lp-node lp-ind-node text-text-primary", dim(ind.id) && "is-dim")}
                onPointerEnter={() => setHover(ind.id)}
                onPointerLeave={() => setHover(null)}
                onClick={() => toggle(ind.id)}
                onKeyDown={(e) => onKey(e, ind.id)}
                onFocus={() => setHover(ind.id)}
                onBlur={() => setHover(null)}
              >
                <g className="lp-pop" style={delay(450 + k * 70)}>
                  <circle className="lp-ind" cx={p.x} cy={p.y} r={IND_R} />
                  <ind.icon x={p.x - 10} y={p.y - 10} width={20} height={20} strokeWidth={1.75} aria-hidden />
                </g>
              </g>
            );
          })}
          {companies.map((c) => {
            const p = at(c.id);
            return (
              <g key={c.id} className={cn("lp-node", dim(c.id) && "is-dim")} onPointerEnter={() => setHover(c.id)} onPointerLeave={() => setHover(null)} aria-hidden>
                <g className="lp-pop" style={delay(t0 + 250 + c.k * 60)}>
                  <circle className="lp-co" cx={p.x} cy={p.y} r={c.r} />
                </g>
              </g>
            );
          })}
        </svg>
        <div aria-hidden>
          <Label p={job} r={0} side="center" w={0} h={0} dimmed={dim(JOB)} wait={200} job>
            품질관리
          </Label>
          {INDUSTRIES.map((ind, k) => (
            <Label key={ind.id} p={at(ind.id)} r={ind.id === open ? IND_R + 7 : IND_R} side={sides.get(ind.id) ?? "below"} w={labelW(ind.id)} h={labelH} dimmed={dim(ind.id)} wait={600 + k * 70}>
              {ind.name}
            </Label>
          ))}
          {companies.map((c) => (
            <Label key={c.id} p={at(c.id)} r={c.r} side={sides.get(c.id) ?? "below"} w={labelW(c.id)} h={labelH} dimmed={dim(c.id)} wait={t0 + 350 + c.k * 60}>
              {c.name}
            </Label>
          ))}
        </div>
      </div>
      <figcaption className="text-caption break-keep text-text-secondary">예시 그래프예요. 산업을 누르면 그 산업의 기업이 펼쳐져요.</figcaption>
    </figure>
  );
}

/** a node's name: inside the job, otherwise on the side placeLabels chose; above/below slide to stay inside the box */
function Label({ p, r, side: chosen, w, h, job, dimmed, wait, children }: { p: Pos; r: number; side: Side | "center"; w: number; h: number; job?: boolean; dimmed: boolean; wait: number; children: string }) {
  // a node the forces pushed toward an edge flips its label to the other side rather than leave the box
  let side = chosen;
  if (side === "below" && p.y + r + 3 + h > H - 1) side = "above";
  else if (side === "above" && p.y - r - 3 - h < 1) side = "below";
  else if (side === "right" && p.x + r + 4 + w > W - 1) side = "left";
  else if (side === "left" && p.x - r - 4 - w < 1) side = "right";
  let x = p.x;
  let y = p.y;
  let tr = "translate(-50%, -50%)";
  if (side === "below" || side === "above") {
    x = Math.min(W - 2 - w / 2, Math.max(2 + w / 2, p.x));
    y = side === "below" ? p.y + r + 3 : p.y - r - 3;
    tr = side === "below" ? "translate(-50%, 0)" : "translate(-50%, -100%)";
  } else if (side === "right") {
    x = p.x + r + 4;
    tr = "translate(0, -50%)";
  } else if (side === "left") {
    x = p.x - r - 4;
    tr = "translate(-100%, -50%)";
  }
  return (
    <span className={cn("lp-label", job && "lp-job-label", dimmed && "is-dim")} style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, transform: tr }}>
      <span className="lp-fade" style={delay(wait)}>
        {children}
      </span>
    </span>
  );
}
