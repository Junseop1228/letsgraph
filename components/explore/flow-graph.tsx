"use client";
/* eslint-disable react-hooks/refs -- the d3-force simulation lives outside React and pushes positions into React Flow state on each tick (engine spike, decisions 2026-11-15 20:56) */
// 나의 취업 그래프 on React Flow (spike, decisions D 2026-11-15 20:56 / 22:5x; research-graph-engine.md option 가).
// Rendering + pan/zoom/drag = @xyflow/react (MIT). Layout = our d3-force simulation (ISC) with the star targets of
// lib/explore/graph.ts. Vertices are circles sized by data (job fixed, industry by linked companies, company by revenue:
// GNode.r from graph.ts), labels sit under the circle. Group plane behind an opened industry = bubblesets-js (MIT).
// Colours only from DESIGN.md tokens (styles/flow-graph.css).
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  Handle,
  Position,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { forceLink, forceManyBody, forceSimulation, forceX, forceY, type ForceX, type ForceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { BubbleSets, rect } from "bubblesets-js";
import { RING, groupOf, type GLink, type GNode, type GraphData } from "@/lib/explore/graph";
import { forceRectCollide, textWidth, type Box } from "@/lib/explore/physics";
import { cn } from "@/lib/utils";

// ---- types -------------------------------------------------------------------------------------
type VData = { g: GNode; aria: string };
type VNode = Node<VData, "vertex">;
type LineData = { kind: GLink["kind"]; width: number; x1: number; y1: number; x2: number; y2: number };
type PathData = { d: string };
type LineEdge = Edge<LineData, "line">;
type BridgeEdge = Edge<PathData, "bridge">;
type PlaneEdge = Edge<PathData, "plane">;
type GEdge = LineEdge | BridgeEdge | PlaneEdge;
type SimNode = GNode & SimulationNodeDatum & { bx?: number; by?: number }; // bx/by = layout anchor before user moves
type SimLink = { source: SimNode; target: SimNode; kind: GLink["kind"] };

type Props = {
  data: GraphData;
  selectedId: string | null;
  onSelect: (n: GNode) => void;
  onBackground: () => void;
  companyIndustry: Record<string, string>;
  label: (n: GNode) => string; // accessible description
};

// Vertex radius = graph.ts r x 1.2 (job 26, industry ~13-20 by linked companies, company ~7-17 by revenue).
const VSCALE = 1.2;
const radius = (g: GNode) => g.r * VSCALE;
// Label type role per vertex kind (px must match the classes in Vertex).
const LABEL_PX: Record<GNode["type"], number> = { center: 16, ind: 14, co: 13 };
// Stars spread a little wider than graph.ts targets so labels fit (targets scaled around each star centre).
const SCALE: Record<GNode["type"], number> = { center: 1, ind: 1.12, co: 1.3 };
const DIST: Record<GLink["kind"], number> = { "job-ind": RING * 1.12, "ind-co": 118, "ind-co-est": 118 };
const STR: Record<GLink["kind"], number> = { "job-ind": 0.25, "ind-co": 0.45, "ind-co-est": 0.45 };
// Fit never zooms below this, so 13px labels stay >= 12px on screen (DESIGN: labels never below 12px); pinch/wheel can still go further.
const FIT_MIN_ZOOM = 0.92;

/** Space a vertex needs: the circle plus its label underneath (kept symmetric so the box stays centred on the circle). */
function footprint(g: GNode): Box {
  const r = radius(g);
  const lw = textWidth(g.label, LABEL_PX[g.type]) + 8;
  const lh = LABEL_PX[g.type] * 1.4 + 4;
  return { w: Math.max(2 * r, lw), h: 2 * r + 2 * lh };
}

function bridgePath(s: SimNode, t: SimNode, sign: 1 | -1): string {
  const sx = s.x ?? 0, sy = s.y ?? 0, tx = t.x ?? 0, ty = t.y ?? 0;
  const mx = (sx + tx) / 2, my = (sy + ty) / 2, dx = tx - sx, dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  let px = -dy / len, py = dx / len;
  if (py * sign < 0) { px = -px; py = -py; }
  const off = Math.min(150, len * 0.3);
  return `M${sx},${sy} Q${mx + px * off},${my + py * off} ${tx},${ty}`;
}

// ---- vertex + edge renderers -------------------------------------------------------------------
type Ctx = { select: (id: string) => void; hover: (id: string | null) => void; dragged: RefObject<boolean> };
const GraphCtx = createContext<Ctx | null>(null);

const Vertex = memo(function Vertex({ id, data }: NodeProps<VNode>) {
  const ctx = useContext(GraphCtx)!;
  const g = data.g;
  const d = radius(g) * 2;
  const shared = g.type === "ind" && (g.shared ?? 0) > 1;
  return (
    <button
      type="button"
      data-gn={g.type}
      aria-description={data.aria} // name = the visible label (WCAG 2.5.3 label in name); details go in the description
      aria-expanded={g.type === "ind" ? !!g.expanded : undefined}
      style={{ width: d, height: d } as CSSProperties}
      className={cn("gv", `gv-${g.type}`, g.saved && "is-saved", (g.basis === "estimated" || g.noData) && "is-est", shared && "is-shared", g.expanded && "is-expanded")}
      onClick={() => {
        if (ctx.dragged.current) return; // the pointer-up that ends a drag is not a click
        ctx.select(id);
      }}
      onMouseEnter={() => ctx.hover(id)}
      onMouseLeave={() => ctx.hover(null)}
      onFocus={() => ctx.hover(id)}
      onBlur={() => ctx.hover(null)}
    >
      <span className={cn("gv-label", g.type === "center" ? "text-body font-bold" : g.type === "ind" ? "text-label-strong" : cn("text-caption", g.saved ? "font-semibold" : "font-medium"))}>{g.label}</span>
      {shared && <span className="gv-badge figures" aria-hidden>{g.shared}</span>}
      {/* React Flow only draws edges between nodes that have handles; ours are invisible (edges use simulated centres) */}
      <Handle type="target" position={Position.Top} isConnectable={false} className="ghandle" />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="ghandle" />
    </button>
  );
});

const LineEdgeView = memo(function LineEdgeView({ data }: EdgeProps<LineEdge>) {
  const d = data!;
  return <path className={cn("ge", d.kind)} d={`M${d.x1},${d.y1}L${d.x2},${d.y2}`} style={{ strokeWidth: d.width }} />;
});
const BridgeEdgeView = memo(function BridgeEdgeView({ data }: EdgeProps<BridgeEdge>) {
  return <path className="gbridge" d={data!.d} />;
});
const PlaneEdgeView = memo(function PlaneEdgeView({ data }: EdgeProps<PlaneEdge>) {
  return <path className="gplane" d={data!.d} />;
});

const nodeTypes = { vertex: Vertex } satisfies NodeTypes;
const edgeTypes = { line: LineEdgeView, bridge: BridgeEdgeView, plane: PlaneEdgeView } satisfies EdgeTypes;

// ---- engine ------------------------------------------------------------------------------------
function Engine({ data, selectedId, onSelect, onBackground, companyIndustry, label }: Props) {
  const rf = useReactFlow<VNode, GEdge>();
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const byIdRef = useRef(new Map<string, SimNode>());
  const linksRef = useRef<SimLink[]>([]);
  const linkWRef = useRef(new Map<string, number>()); // link weight by "source>target", built once per data change
  const posRef = useRef(new Map<string, { x: number; y: number; vx: number; vy: number }>());
  const planeRef = useRef<string | null>(null);
  const draggedRef = useRef(false);
  const fitKeyRef = useRef("");
  const simNodesRef = useRef<SimNode[]>([]);
  const offsetRef = useRef(new Map<string, { x: number; y: number }>()); // user moves per vertex (option 가)
  const forceXRef = useRef<ForceX<SimNode> | null>(null);
  const forceYRef = useRef<ForceY<SimNode> | null>(null);
  const cbRef = useRef({ onSelect, onBackground, label, companyIndustry });
  cbRef.current = { onSelect, onBackground, label, companyIndustry };

  const [nodes, setNodes] = useState<VNode[]>([]);
  const [frame, setFrame] = useState(0);
  const [lit, setLit] = useState<Set<string> | null>(null);
  const [moved, setMoved] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const topLeft = (s: SimNode) => ({ x: (s.x ?? 0) - radius(s), y: (s.y ?? 0) - radius(s) });

  // A vertex's home = layout anchor + its own move + the moves of what it hangs on (its job star, its industry).
  const offsetOf = (n: GNode) => {
    const om = offsetRef.current;
    const ci = cbRef.current.companyIndustry;
    const keys = n.type === "center" ? [n.id] : n.type === "ind" ? [`job:${n.job}`, n.id] : [`job:${n.job}`, `ind:${n.job}:${ci[n.ref]}`, n.id];
    let x = 0, y = 0;
    for (const key of keys) {
      const v = om.get(key);
      if (v) { x += v.x; y += v.y; }
    }
    return { x, y };
  };
  const reanchor = () => {
    for (const s of simNodesRef.current) {
      const o = offsetOf(s);
      s.tx = (s.bx ?? s.tx) + o.x;
      s.ty = (s.by ?? s.ty) + o.y;
    }
    forceXRef.current?.x((d) => d.tx); // d3 forceX/forceY cache targets: re-setting the accessor re-reads them
    forceYRef.current?.y((d) => d.ty);
  };

  // (re)build the simulation whenever the graph data changes (stars toggled, industry opened, company saved)
  useEffect(() => {
    const centre = new Map(data.nodes.filter((n) => n.type === "center").map((n) => [n.job, n]));
    const sn: SimNode[] = data.nodes.map((n) => {
      const c = centre.get(n.job);
      const k = SCALE[n.type];
      const bx = c ? c.tx + (n.tx - c.tx) * k : n.tx;
      const by = c ? c.ty + (n.ty - c.ty) * k : n.ty;
      const o = offsetOf(n);
      const tx = bx + o.x, ty = by + o.y;
      const old = posRef.current.get(n.id);
      if (old) return { ...n, tx, ty, bx, by, ...old };
      if (n.type === "co") {
        const parent = posRef.current.get(`ind:${n.job}:${cbRef.current.companyIndustry[n.ref]}`);
        return { ...n, tx, ty, bx, by, x: parent?.x ?? tx, y: parent?.y ?? ty };
      }
      return { ...n, tx, ty, bx, by, x: tx, y: ty };
    });
    const byId = new Map(sn.map((n) => [n.id, n]));
    byIdRef.current = byId;
    simNodesRef.current = sn;
    const links: SimLink[] = data.links.flatMap((l) => {
      const s = byId.get(l.source), t = byId.get(l.target);
      return s && t ? [{ source: s, target: t, kind: l.kind }] : [];
    });
    linksRef.current = links;
    linkWRef.current = new Map(data.links.map((l) => [`${l.source}>${l.target}`, l.w]));

    let sim = simRef.current;
    if (!sim) {
      sim = forceSimulation<SimNode>().velocityDecay(0.42);
      simRef.current = sim;
    }
    const expandedInd = sn.find((n) => n.type === "ind" && n.expanded) ?? null;
    let tickNo = 0;
    const updatePlane = () => {
      if (!expandedInd) { planeRef.current = null; return; }
      const ci = cbRef.current.companyIndustry;
      const isMember = (n: SimNode) => n.id === expandedInd.id || (n.type === "co" && n.job === expandedInd.job && ci[n.ref] === expandedInd.ref);
      // circle + label underneath
      const box = (n: SimNode, pad: number) => {
        const r = radius(n);
        const half = Math.max(r, (textWidth(n.label, LABEL_PX[n.type]) + 4) / 2);
        const h = 2 * r + LABEL_PX[n.type] * 1.4 + 4;
        return rect((n.x ?? 0) - half - pad, (n.y ?? 0) - r - pad, half * 2 + pad * 2, h + pad * 2);
      };
      const bs = new BubbleSets();
      bs.pushMember(...sn.filter(isMember).map((n) => box(n, 10)));
      bs.pushNonMember(...sn.filter((n) => !isMember(n) && n.job === expandedInd.job).map((n) => box(n, 4)));
      planeRef.current = bs.compute().sample(8).simplify(0).bSplines().simplify(0).toString();
    };

    sim
      .nodes(sn)
      .force("link", forceLink<SimNode, SimLink>(links).distance((l) => DIST[l.kind]).strength((l) => STR[l.kind]))
      .force("charge", forceManyBody<SimNode>().strength((d) => (d.type === "center" ? -220 : d.type === "ind" ? -140 : -80)).distanceMax(220))
      .force("collide", forceRectCollide<SimNode>(footprint, 6, 0.6))
      .force("x", (forceXRef.current = forceX<SimNode>((d) => d.tx).strength((d) => (d.type === "center" ? 0.6 : d.type === "ind" ? 0.3 : 0.28))))
      .force("y", (forceYRef.current = forceY<SimNode>((d) => d.ty).strength((d) => (d.type === "center" ? 0.6 : d.type === "ind" ? 0.3 : 0.28))));
    sim.alphaDecay(reduced ? 0.12 : 0.03);
    sim.on("tick", () => {
      for (const n of sn) posRef.current.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, vx: n.vx ?? 0, vy: n.vy ?? 0 });
      if (tickNo++ % 2 === 0 || sim!.alpha() < 0.05) updatePlane();
      setNodes((cur) =>
        cur.map((nd) => {
          const s = byId.get(nd.id);
          return s ? { ...nd, position: topLeft(s) } : nd;
        }),
      );
      setFrame((f) => f + 1);
    });

    updatePlane();
    setNodes((cur) => {
      const old = new Map(cur.map((n) => [n.id, n]));
      return sn.map((s, i) => ({
        id: s.id,
        type: "vertex" as const,
        position: topLeft(s),
        data: { g: data.nodes[i], aria: cbRef.current.label(data.nodes[i]) },
        measured: old.get(s.id)?.measured,
        selectable: false,
        zIndex: s.type === "center" ? 3 : s.type === "ind" ? 2 : 1,
      }));
    });
    sim.alpha(reduced ? 0.3 : 0.6).restart();

    const key = data.nodes.filter((n) => n.type !== "ind").map((n) => n.id).join("|");
    if (key !== fitKeyRef.current) {
      const first = fitKeyRef.current === "";
      fitKeyRef.current = key;
      const t = setTimeout(() => void rf.fitView({ padding: 0.16, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM, duration: reduced || first ? 0 : 450 }), reduced ? 60 : 650);
      return () => clearTimeout(t);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void simRef.current?.stop(), []);

  const onNodesChange = useCallback((changes: NodeChange<VNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);

  // Option 가 (decisions 2026-11-15 23:1x): the dragged vertex is pinned under the pointer and its home moves with it,
  // so it stays where it is dropped; a dragged job carries its whole star, a dragged industry its companies.
  const pin = (n: VNode) => {
    const s = byIdRef.current.get(n.id);
    if (!s) return;
    const px = n.position.x + radius(s), py = n.position.y + radius(s);
    const cur = offsetRef.current.get(s.id) ?? { x: 0, y: 0 };
    offsetRef.current.set(s.id, { x: cur.x + px - s.tx, y: cur.y + py - s.ty });
    reanchor();
    s.fx = px;
    s.fy = py;
  };
  const resetLayout = () => {
    offsetRef.current.clear();
    reanchor();
    simRef.current?.alpha(0.5).restart();
    setMoved(false);
    setTimeout(() => void rf.fitView({ padding: 0.16, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM, duration: reduced ? 0 : 450 }), reduced ? 60 : 700);
  };

  const ctx = useMemo<Ctx>(
    () => ({
      select: (id) => {
        const g = byIdRef.current.get(id);
        if (g) cbRef.current.onSelect(g);
      },
      hover: (id) => {
        const d = id ? byIdRef.current.get(id) : null;
        setLit(d ? groupOf(d, [...byIdRef.current.values()], (c) => cbRef.current.companyIndustry[c]) : null);
      },
      dragged: draggedRef,
    }),
    [],
  );

  // hover / selection classes on top of the simulated positions
  const shown = useMemo(
    () => nodes.map((n) => ({ ...n, className: cn(lit?.has(n.id) && "lit", n.id === selectedId && "sel") })),
    [nodes, lit, selectedId],
  );

  const hoveredId = lit ? [...lit][0] : null; // groupOf puts the hovered node first
  const edges = useMemo<GEdge[]>(() => {
    const byId = byIdRef.current;
    const out: GEdge[] = [];
    const ex = data.nodes.find((n) => n.type === "ind" && n.expanded);
    if (ex && planeRef.current) out.push({ id: "plane", source: ex.id, target: ex.id, type: "plane", data: { d: planeRef.current }, selectable: false, focusable: false });
    for (const l of linksRef.current) {
      const w = linkWRef.current.get(`${l.source.id}>${l.target.id}`) ?? 1;
      out.push({
        id: `l:${l.source.id}>${l.target.id}`,
        source: l.source.id,
        target: l.target.id,
        type: "line",
        className: lit && lit.has(l.source.id) && lit.has(l.target.id) ? "lit" : undefined,
        // more posting evidence = thicker (spec FR-MAP-03): job -> industry 1.5-4.5px; company links posting 2px, estimated 1px
        data: { kind: l.kind, width: l.kind === "job-ind" ? 1.5 + ((Math.min(w, 6.4) - 1) / 5.4) * 3 : w, x1: l.source.x ?? 0, y1: l.source.y ?? 0, x2: l.target.x ?? 0, y2: l.target.y ?? 0 },
        selectable: false,
        focusable: false,
      });
    }
    const hovered = hoveredId ? byId.get(hoveredId) : null;
    const litRef = hovered ? (hovered.type === "co" ? `co:${hovered.ref}` : hovered.ref) : null;
    const selRef = !selectedId ? null : selectedId.startsWith("ind:") ? selectedId.split(":")[2] : selectedId.startsWith("co:") ? `co:${selectedId.split(":")[2]}` : null;
    for (const b of data.bridges) {
      const s = byId.get(b.source), t = byId.get(b.target);
      if (!s || !t) continue;
      const on = b.ref === litRef || b.ref === selRef;
      if (!on) continue; // hidden bridges are not rendered at all (they were most of the edges in big graphs)
      out.push({ id: `b:${b.source}~${b.target}`, source: b.source, target: b.target, type: "bridge", className: "on", data: { d: bridgePath(s, t, b.sign) }, selectable: false, focusable: false });
    }
    return out;
  }, [frame, data, lit, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (dir: 1 | -1) => (dir > 0 ? rf.zoomIn({ duration: reduced ? 0 : 200 }) : rf.zoomOut({ duration: reduced ? 0 : 200 }));

  return (
    <GraphCtx.Provider value={ctx}>
      <ReactFlow<VNode, GEdge>
        className={cn("lg-flow", lit && "hovering")}
        nodes={shown}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={(_e, n) => {
          draggedRef.current = true;
          simRef.current?.alphaTarget(0.25).restart();
          pin(n);
        }}
        onNodeDrag={(_e, n) => pin(n)}
        onNodeDragStop={(_e, n) => {
          simRef.current?.alphaTarget(0);
          const s = byIdRef.current.get(n.id);
          if (s) { s.fx = null; s.fy = null; }
          setMoved(true);
          setTimeout(() => { draggedRef.current = false; }, 0);
        }}
        onPaneClick={() => cbRef.current.onBackground()}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        zoomOnDoubleClick={false}
        nodeDragThreshold={4}
        minZoom={0.3}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM }}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
      </ReactFlow>
      <div className="absolute bottom-3 right-3 z-10 flex gap-1" role="group" aria-label="확대와 축소">
        {moved && <button type="button" onClick={resetLayout} className="h-8 rounded-element bg-bg-surface px-3 text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">배치 되돌리기</button>}
        <button type="button" onClick={() => zoom(1)} aria-label="확대" className="size-8 rounded-element bg-bg-surface text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">+</button>
        <button type="button" onClick={() => zoom(-1)} aria-label="축소" className="size-8 rounded-element bg-bg-surface text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">−</button>
        <button type="button" onClick={() => void rf.fitView({ padding: 0.16, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM, duration: reduced ? 0 : 450 })} className="h-8 rounded-element bg-bg-surface px-3 text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">전체 보기</button>
      </div>
    </GraphCtx.Provider>
  );
}

export function FlowGraph(props: Props) {
  return (
    <div className="relative h-full w-full" role="group" aria-label="나의 취업 그래프">
      <ReactFlowProvider>
        <Engine {...props} />
      </ReactFlowProvider>
    </div>
  );
}
