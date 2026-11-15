"use client";
/* eslint-disable react-hooks/refs -- the d3-force simulation lives outside React and pushes positions into React Flow state on each tick (engine spike, decisions 2026-11-15 20:56) */
// 나의 취업 그래프 on React Flow (spike, decisions D 2026-11-15 20:56; research-graph-engine.md option 가).
// Rendering + pan/zoom/drag = @xyflow/react (MIT). Layout = our d3-force simulation (ISC) with the same
// star targets as lib/explore/graph.ts, plus a rectangle collision force for pill nodes.
// Group plane behind an opened industry = bubblesets-js (MIT). Colours only from DESIGN.md tokens (styles/flow-graph.css).
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  Handle,
  Position,
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
import { forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { BubbleSets, rect } from "bubblesets-js";
import { RING, groupOf, type GLink, type GNode, type GraphData } from "@/lib/explore/graph";
import { forceRectCollide, textWidth, type Box } from "@/lib/explore/physics";
import { formatEokShort } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---- types -------------------------------------------------------------------------------------
type PillData = { g: GNode; aria: string; rev: string | null };
type PillNode = Node<PillData, "pill">;
type LineData = { kind: GLink["kind"]; width: number; x1: number; y1: number; x2: number; y2: number };
type PathData = { d: string };
type LineEdge = Edge<LineData, "line">;
type BridgeEdge = Edge<PathData, "bridge">;
type PlaneEdge = Edge<PathData, "plane">;
type GEdge = LineEdge | BridgeEdge | PlaneEdge;
type SimNode = GNode & SimulationNodeDatum;
type SimLink = { source: SimNode; target: SimNode; kind: GLink["kind"] };

type Props = {
  data: GraphData;
  selectedId: string | null;
  onSelect: (n: GNode) => void;
  onBackground: () => void;
  companyIndustry: Record<string, string>;
  label: (n: GNode) => string; // accessible name
  revenueOf?: (companyId: string) => number | null | undefined;
};

// Pills sit further out than the v1.3 dots so names fit (targets scaled around each star centre).
const SCALE: Record<GNode["type"], number> = { center: 1, ind: 1.18, co: 1.4 };
const DIST: Record<GLink["kind"], number> = { "job-ind": RING * 1.18, "ind-co": 128, "ind-co-est": 128 };
const STR: Record<GLink["kind"], number> = { "job-ind": 0.25, "ind-co": 0.45, "ind-co-est": 0.45 };
// Fit never zooms below this, so 13px captions stay >= 12px on screen (DESIGN: labels never below 12px); pinch/wheel can still go further.
const FIT_MIN_ZOOM = 0.92;

/** Size estimate until React Flow reports the measured size (same type roles as the Pill below). */
function estimate(g: GNode, rev: string | null): Box {
  if (g.type === "center") return { w: textWidth(g.label, 18) + 36, h: 40 };
  if (g.type === "ind") return { w: textWidth(g.label, 14) + 6 + textWidth(`${g.count ?? 0}곳`, 13) + 24, h: 32 };
  return { w: textWidth(g.label, 14) + (rev ? 6 + textWidth(rev, 13) : 0) + 22, h: 28 };
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

// ---- node + edge renderers ---------------------------------------------------------------------
type Ctx = { select: (id: string) => void; hover: (id: string | null) => void; dragged: RefObject<boolean> };
const GraphCtx = createContext<Ctx | null>(null);

const Pill = memo(function Pill({ id, data }: NodeProps<PillNode>) {
  const ctx = useContext(GraphCtx)!;
  const g = data.g;
  const shared = g.type === "ind" && (g.shared ?? 0) > 1;
  return (
    <button
      type="button"
      data-gn={g.type}
      aria-description={data.aria} // name = the visible text (WCAG 2.5.3 label in name); details go in the description
      aria-expanded={g.type === "ind" ? !!g.expanded : undefined}
      className={cn("gpill", `gp-${g.type}`, g.saved && "is-saved", (g.basis === "estimated" || g.noData) && "is-est", shared && "is-shared", g.expanded && "is-expanded")}
      onClick={() => {
        if (ctx.dragged.current) return; // the pointer-up that ends a drag is not a click
        ctx.select(id);
      }}
      onMouseEnter={() => ctx.hover(id)}
      onMouseLeave={() => ctx.hover(null)}
      onFocus={() => ctx.hover(id)}
      onBlur={() => ctx.hover(null)}
    >
      <span className={g.type === "center" ? "text-heading-3" : g.type === "ind" ? "text-label-strong" : "text-label"}>{g.label}</span>{" "}
      {g.type === "ind" && <span className="gp-meta figures text-caption">{g.count}곳</span>}
      {g.type === "co" && data.rev && <span className="gp-meta figures text-caption">{data.rev}</span>}
      {shared && <span className="gp-badge figures" aria-hidden>{g.shared}</span>}
      {/* React Flow only draws edges between nodes that have handles; ours are invisible and centred (edges use simulated centres) */}
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

const nodeTypes = { pill: Pill } satisfies NodeTypes;
const edgeTypes = { line: LineEdgeView, bridge: BridgeEdgeView, plane: PlaneEdgeView } satisfies EdgeTypes;

// ---- engine ------------------------------------------------------------------------------------
function Engine({ data, selectedId, onSelect, onBackground, companyIndustry, label, revenueOf }: Props) {
  const rf = useReactFlow<PillNode, GEdge>();
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const byIdRef = useRef(new Map<string, SimNode>());
  const linksRef = useRef<SimLink[]>([]);
  const linkWRef = useRef(new Map<string, number>()); // link weight by "source>target", built once per data change
  const posRef = useRef(new Map<string, { x: number; y: number; vx: number; vy: number }>());
  const sizeRef = useRef(new Map<string, Box>());
  const revRef = useRef(new Map<string, string | null>());
  const planeRef = useRef<string | null>(null);
  const draggedRef = useRef(false);
  const fitKeyRef = useRef("");
  const cbRef = useRef({ onSelect, onBackground, label, revenueOf, companyIndustry });
  cbRef.current = { onSelect, onBackground, label, revenueOf, companyIndustry };

  const [nodes, setNodes] = useState<PillNode[]>([]);
  const [frame, setFrame] = useState(0);
  const [lit, setLit] = useState<Set<string> | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sizeOf = (n: SimNode): Box => sizeRef.current.get(n.id) ?? estimate(n, revRef.current.get(n.id) ?? null);

  // (re)build the simulation whenever the graph data changes (stars toggled, industry opened, company saved)
  useEffect(() => {
    const rev = cbRef.current.revenueOf;
    revRef.current = new Map(data.nodes.map((n) => [n.id, n.type === "co" && rev ? (rev(n.ref) == null ? null : formatEokShort(rev(n.ref))) : null]));
    const centre = new Map(data.nodes.filter((n) => n.type === "center").map((n) => [n.job, n]));
    const sn: SimNode[] = data.nodes.map((n) => {
      const c = centre.get(n.job);
      const k = SCALE[n.type];
      const tx = c ? c.tx + (n.tx - c.tx) * k : n.tx;
      const ty = c ? c.ty + (n.ty - c.ty) * k : n.ty;
      const old = posRef.current.get(n.id);
      if (old) return { ...n, tx, ty, ...old };
      if (n.type === "co") {
        const parent = posRef.current.get(`ind:${n.job}:${cbRef.current.companyIndustry[n.ref]}`);
        return { ...n, tx, ty, x: parent?.x ?? tx, y: parent?.y ?? ty };
      }
      return { ...n, tx, ty, x: tx, y: ty };
    });
    const byId = new Map(sn.map((n) => [n.id, n]));
    byIdRef.current = byId;
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
      const box = (n: SimNode, pad: number) => {
        const b = sizeOf(n);
        return rect((n.x ?? 0) - b.w / 2 - pad, (n.y ?? 0) - b.h / 2 - pad, b.w + pad * 2, b.h + pad * 2);
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
      .force("collide", forceRectCollide<SimNode>(sizeOf, 8, 0.6))
      .force("x", forceX<SimNode>((d) => d.tx).strength((d) => (d.type === "center" ? 0.6 : d.type === "ind" ? 0.3 : 0.28)))
      .force("y", forceY<SimNode>((d) => d.ty).strength((d) => (d.type === "center" ? 0.6 : d.type === "ind" ? 0.3 : 0.28)));
    sim.alphaDecay(reduced ? 0.12 : 0.03);
    sim.on("tick", () => {
      for (const n of sn) posRef.current.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, vx: n.vx ?? 0, vy: n.vy ?? 0 });
      if (tickNo++ % 2 === 0 || sim!.alpha() < 0.05) updatePlane();
      setNodes((cur) =>
        cur.map((nd) => {
          const s = byId.get(nd.id);
          if (!s) return nd;
          const b = sizeOf(s);
          return { ...nd, position: { x: (s.x ?? 0) - b.w / 2, y: (s.y ?? 0) - b.h / 2 } };
        }),
      );
      setFrame((f) => f + 1);
    });

    updatePlane();
    setNodes((cur) => {
      const old = new Map(cur.map((n) => [n.id, n]));
      return sn.map((s, i) => {
        const b = sizeOf(s);
        return {
          id: s.id,
          type: "pill" as const,
          position: { x: (s.x ?? 0) - b.w / 2, y: (s.y ?? 0) - b.h / 2 },
          data: { g: data.nodes[i], aria: cbRef.current.label(data.nodes[i]), rev: revRef.current.get(s.id) ?? null },
          measured: old.get(s.id)?.measured,
          selectable: false,
          zIndex: s.type === "center" ? 3 : s.type === "ind" ? 2 : 1,
        };
      });
    });
    sim.alpha(reduced ? 0.3 : 0.6).restart();

    const key = data.nodes.filter((n) => n.type !== "ind").map((n) => n.id).join("|");
    if (key !== fitKeyRef.current) {
      const first = fitKeyRef.current === "";
      fitKeyRef.current = key;
      const t = setTimeout(() => void rf.fitView({ padding: 0.14, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM, duration: reduced || first ? 0 : 450 }), reduced ? 60 : 650);
      return () => clearTimeout(t);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void simRef.current?.stop(), []);

  const onNodesChange = useCallback((changes: NodeChange<PillNode>[]) => {
    for (const c of changes) if (c.type === "dimensions" && c.dimensions) sizeRef.current.set(c.id, { w: c.dimensions.width, h: c.dimensions.height });
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const pin = (n: PillNode) => {
    const s = byIdRef.current.get(n.id);
    if (!s) return;
    const b = sizeOf(s);
    s.fx = n.position.x + b.w / 2;
    s.fy = n.position.y + b.h / 2;
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

  const hoveredRef = lit ? [...lit][0] : null;
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
        data: { kind: l.kind, width: l.kind === "job-ind" ? 1 + ((Math.min(w, 6.4) - 1) / 5.4) * 2 : 1, x1: l.source.x ?? 0, y1: l.source.y ?? 0, x2: l.target.x ?? 0, y2: l.target.y ?? 0 },
        selectable: false,
        focusable: false,
      });
    }
    const hovered = hoveredRef ? byId.get(hoveredRef) : null;
    const litRef = hovered ? (hovered.type === "co" ? `co:${hovered.ref}` : hovered.ref) : null;
    const selRef = !selectedId ? null : selectedId.startsWith("ind:") ? selectedId.split(":")[2] : selectedId.startsWith("co:") ? `co:${selectedId.split(":")[2]}` : null;
    for (const b of data.bridges) {
      const s = byId.get(b.source), t = byId.get(b.target);
      if (!s || !t) continue;
      const on = b.ref === litRef || b.ref === selRef;
      if (!on) continue; // hidden bridges are not rendered at all (they were most of the edges in big graphs)
      out.push({ id: `b:${b.source}~${b.target}`, source: b.source, target: b.target, type: "bridge", className: on ? "on" : undefined, data: { d: bridgePath(s, t, b.sign) }, selectable: false, focusable: false });
    }
    return out;
  }, [frame, data, lit, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (dir: 1 | -1) => (dir > 0 ? rf.zoomIn({ duration: reduced ? 0 : 200 }) : rf.zoomOut({ duration: reduced ? 0 : 200 }));

  return (
    <GraphCtx.Provider value={ctx}>
      <ReactFlow<PillNode, GEdge>
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
        fitViewOptions={{ padding: 0.14, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM }}
        attributionPosition="bottom-left"
      />
      <div className="absolute bottom-3 right-3 z-10 flex gap-1" role="group" aria-label="확대와 축소">
        <button type="button" onClick={() => zoom(1)} aria-label="확대" className="size-8 rounded-element bg-bg-surface text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">+</button>
        <button type="button" onClick={() => zoom(-1)} aria-label="축소" className="size-8 rounded-element bg-bg-surface text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">−</button>
        <button type="button" onClick={() => void rf.fitView({ padding: 0.14, maxZoom: 1.3, minZoom: FIT_MIN_ZOOM, duration: reduced ? 0 : 450 })} className="h-8 rounded-element bg-bg-surface px-3 text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">전체 보기</button>
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
