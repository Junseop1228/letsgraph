"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/use-memo -- this v1.3 port is replaced by the graph-engine switch (decisions 2026-11-14) */
// 나의 취업 그래프 view (force-directed, Obsidian-like: drag nodes, wheel/pinch zoom, hover lights related nodes).
// Ported from prototype v1.3 graph.jsx to TypeScript + d3 modules (d3-force, d3-drag, d3-zoom, d3-selection: ISC).
// Colours come from DESIGN.md tokens via styles/graph.css.
import { useEffect, useRef, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from "d3-force";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { drag as d3drag } from "d3-drag";
import { RING, groupOf, type GBridge, type GLink, type GNode, type GraphData } from "@/lib/explore/graph";

type SimNode = GNode & SimulationNodeDatum;
type SimLink = Omit<GLink, "source" | "target"> & { source: SimNode; target: SimNode };
type SimBridge = Omit<GBridge, "source" | "target"> & { source: SimNode; target: SimNode };

const DIST: Record<GLink["kind"], number> = { "job-ind": RING, "ind-co": 104, "ind-co-est": 104 };
const STR: Record<GLink["kind"], number> = { "job-ind": 0.25, "ind-co": 0.5, "ind-co-est": 0.5 };

type Props = {
  data: GraphData;
  selectedId: string | null;
  onSelect: (n: GNode) => void;
  onBackground: () => void;
  companyIndustry: Record<string, string>;
  label: (n: GNode) => string; // accessible name
  padRight?: number;
};

export function JobGraph({ data, selectedId, onSelect, onBackground, companyIndustry, label, padRight = 0 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const posRef = useRef(new Map<string, { x: number; y: number; vx: number; vy: number }>());
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const cbRef = useRef({ onSelect, onBackground, label });
  cbRef.current = { onSelect, onBackground, label };
  const padRef = useRef(padRight);
  padRef.current = padRight;
  const fitKeyRef = useRef("");
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.max(e.contentRect.width, 200), h: Math.max(e.contentRect.height, 200) }));
    ro.observe(wrapRef.current!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = select(svgRef.current!);
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (e) => svg.select("g.viewport").attr("transform", e.transform.toString()));
    svg.call(z).on("dblclick.zoom", null);
    svg.on("click.bg", (e: MouseEvent) => {
      const t = e.target as Element;
      if (t === svgRef.current || t.classList.contains("g-bg")) cbRef.current.onBackground();
    });
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const fit = (animate = true) => {
    const s = sizeRef.current;
    const sim = simRef.current;
    if (!s || !sim || !zoomRef.current) return;
    const ns = sim.nodes();
    if (!ns.length) return;
    const xs = ns.map((p) => p.x ?? 0);
    const ys = ns.map((p) => p.y ?? 0);
    const x0 = Math.min(...xs) - 70, x1 = Math.max(...xs) + 70, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 50;
    const top = 20;
    const k = Math.max(0.3, Math.min(1.15, Math.min((s.w - padRef.current - 20) / (x1 - x0), (s.h - top - 20) / (y1 - y0))));
    const t = zoomIdentity.translate((s.w - padRef.current) / 2 - ((x0 + x1) / 2) * k, top + (s.h - top - 20) / 2 - ((y0 + y1) / 2) * k).scale(k);
    const sel = select(svgRef.current!);
    if (animate && !reduced) sel.transition().duration(450).call(zoomRef.current.transform, t);
    else sel.call(zoomRef.current.transform, t);
  };

  useEffect(() => {
    if (!size) return;
    const svg = select(svgRef.current!);
    const g = svg.select<SVGGElement>("g.viewport");
    g.classed("hovering", false);
    const nodes: SimNode[] = data.nodes.map((n) => {
      const old = posRef.current.get(n.id);
      if (old) return { ...n, ...old };
      if (n.type === "co") {
        const parent = posRef.current.get(`ind:${n.job}:${companyIndustry[n.ref]}`);
        return { ...n, x: parent?.x ?? n.tx, y: parent?.y ?? n.ty };
      }
      return { ...n, x: n.tx, y: n.ty };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.links.flatMap((l) => {
      const s = byId.get(l.source), t = byId.get(l.target);
      return s && t ? [{ ...l, source: s, target: t }] : [];
    });
    const bridges: SimBridge[] = data.bridges.flatMap((b) => {
      const s = byId.get(b.source), t = byId.get(b.target);
      return s && t ? [{ ...b, source: s, target: t }] : [];
    });

    let sim = simRef.current;
    if (!sim) {
      sim = forceSimulation<SimNode>().velocityDecay(0.42);
      simRef.current = sim;
    }
    sim
      .nodes(nodes)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance((l) => DIST[l.kind]).strength((l) => STR[l.kind]))
      .force("charge", forceManyBody<SimNode>().strength((d) => (d.type === "center" ? -200 : d.type === "ind" ? -120 : -70)).distanceMax(180))
      .force("collide", forceCollide<SimNode>((d) => d.r + (d.type === "ind" ? 22 : d.type === "co" ? 26 : 16)).strength(0.85))
      .force("x", forceX<SimNode>((d) => d.tx).strength((d) => (d.type === "center" ? 0.6 : d.type === "ind" ? 0.32 : 0.35)))
      .force("y", forceY<SimNode>((d) => d.ty).strength((d) => (d.type === "center" ? 0.6 : d.type === "ind" ? 0.32 : 0.35)));
    sim.alphaDecay(reduced ? 0.12 : 0.03);

    const lAll = g
      .select("g.links")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links, (l) => `${l.source.id}>${l.target.id}`)
      .join("line")
      .attr("class", (l) => `gl ${l.kind}`)
      .attr("stroke-width", (l) => l.w);

    const bAll = g
      .select("g.bridges")
      .selectAll<SVGPathElement, SimBridge>("path")
      .data(bridges, (b) => `${b.source.id}~${b.target.id}`)
      .join("path")
      .attr("class", "bridge");

    const nAll = g
      .select("g.nodes")
      .selectAll<SVGGElement, SimNode>("g.gn")
      .data(nodes, (d) => d.id)
      .join((enter) => {
        const e = enter.append("g").attr("tabindex", 0).attr("role", "button");
        e.append("circle").attr("class", "halo");
        e.append("circle").attr("class", "shape");
        e.append("text").attr("class", "lbl");
        e.append("circle").attr("class", "badge");
        e.append("text").attr("class", "badge-n");
        return e;
      })
      .attr("class", (d) =>
        ["gn", `t-${d.type}`, d.type === "ind" && (d.shared ?? 0) > 1 ? "shared" : "", d.saved ? "saved" : "", d.noData ? "nodata" : "", d.basis === "estimated" ? "est" : "", d.expanded ? "expanded" : ""].join(" "),
      )
      .attr("aria-label", (d) => cbRef.current.label(d));
    nAll.select("circle.halo").attr("r", (d) => d.r + 7);
    nAll.select("circle.shape").attr("r", (d) => d.r);
    nAll.select("text.lbl").text((d) => d.label).attr("dy", (d) => (d.type === "center" ? -(RING + 32) : d.r + 15));
    const showBadge = (d: SimNode) => d.type === "ind" && (d.shared ?? 0) > 1;
    nAll.select("circle.badge").attr("r", (d) => (showBadge(d) ? 8 : 0)).attr("cx", (d) => -d.r * 0.85).attr("cy", (d) => -d.r * 0.85);
    nAll.select("text.badge-n").text((d) => (showBadge(d) ? String(d.shared) : "")).attr("x", (d) => -d.r * 0.85).attr("y", (d) => -d.r * 0.85);

    const dragB = d3drag<SVGGElement, SimNode>()
      .clickDistance(5)
      .on("start", (e, d) => {
        if (!e.active) sim!.alphaTarget(0.25).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim!.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nAll.call(dragB);

    const highlight = (d: SimNode) => {
      const set = groupOf(d, nodes, (c) => companyIndustry[c]);
      g.classed("hovering", true);
      nAll.classed("lit", (n) => set.has(n.id));
      lAll.classed("lit", (l) => set.has(l.source.id) && set.has(l.target.id));
      bAll.classed("lit", (b) => b.ref === (d.type === "co" ? `co:${d.ref}` : d.ref));
    };
    const clear = () => {
      g.classed("hovering", false);
      nAll.classed("lit", false);
      lAll.classed("lit", false);
      bAll.classed("lit", false);
    };
    nAll
      .on("mouseenter", (_e, d) => highlight(d))
      .on("mouseleave", clear)
      .on("focus", (_e, d) => highlight(d))
      .on("blur", clear)
      .on("click", (e: MouseEvent, d) => {
        e.stopPropagation();
        cbRef.current.onSelect(d);
      })
      .on("keydown", (e: KeyboardEvent, d) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cbRef.current.onSelect(d);
        }
      });

    const curve = (b: SimBridge) => {
      const sx = b.source.x ?? 0, sy = b.source.y ?? 0, tx = b.target.x ?? 0, ty = b.target.y ?? 0;
      const mx = (sx + tx) / 2, my = (sy + ty) / 2, dx = tx - sx, dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      let px = -dy / len, py = dx / len;
      if (py * b.sign < 0) { px = -px; py = -py; }
      const off = Math.min(150, len * 0.3);
      return `M${sx},${sy} Q${mx + px * off},${my + py * off} ${tx},${ty}`;
    };
    sim.on("tick", () => {
      lAll.attr("x1", (l) => l.source.x ?? 0).attr("y1", (l) => l.source.y ?? 0).attr("x2", (l) => l.target.x ?? 0).attr("y2", (l) => l.target.y ?? 0);
      bAll.attr("d", curve);
      nAll.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      for (const n of nodes) posRef.current.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, vx: n.vx ?? 0, vy: n.vy ?? 0 });
    });
    sim.alpha(reduced ? 0.3 : 0.6).restart();

    const key = nodes.filter((n) => n.type !== "ind").map((n) => `${n.id}@${n.tx},${n.ty}`).join("|");
    if (key !== fitKeyRef.current) {
      fitKeyRef.current = key;
      const t = setTimeout(() => fit(true), reduced ? 50 : 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, size && Math.round(size.w / 40), size && Math.round(size.h / 40)]);

  useEffect(() => () => void simRef.current?.stop(), []);

  // selection ring + keep the selected item's bridges visible
  useEffect(() => {
    const svg = select(svgRef.current!);
    svg.selectAll<SVGGElement, SimNode>("g.gn").classed("sel", (d) => d.id === selectedId);
    const ref = !selectedId ? null : selectedId.startsWith("ind:") ? selectedId.split(":")[2] : selectedId.startsWith("co:") ? `co:${selectedId.split(":")[2]}` : null;
    svg.selectAll<SVGPathElement, SimBridge>("path.bridge").classed("on", (b) => !!ref && b.ref === ref);
  }, [selectedId, data]);

  const zoomBy = (f: number) => {
    if (!zoomRef.current) return;
    const sel = select(svgRef.current!);
    if (reduced) sel.call(zoomRef.current.scaleBy, f);
    else sel.transition().duration(250).call(zoomRef.current.scaleBy, f);
  };

  return (
    <div ref={wrapRef} className="job-graph relative h-full w-full">
      <svg ref={svgRef} width={size?.w ?? "100%"} height={size?.h ?? "100%"} aria-label="나의 취업 그래프" className="block touch-none">
        <rect className="g-bg" x="0" y="0" width="100%" height="100%" />
        <g className="viewport">
          <g className="bridges" />
          <g className="links" />
          <g className="nodes" />
        </g>
      </svg>
      <div className="absolute bottom-3 right-3 flex gap-1" role="group" aria-label="확대와 축소">
        <button type="button" onClick={() => zoomBy(1.3)} aria-label="확대" className="size-8 rounded-element bg-bg-surface text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="축소" className="size-8 rounded-element bg-bg-surface text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">−</button>
        <button type="button" onClick={() => fit(true)} className="h-8 rounded-element bg-bg-surface px-3 text-label shadow-[0_0_0_1px_var(--color-border)] hover:bg-overlay-hover">전체 보기</button>
      </div>
    </div>
  );
}
