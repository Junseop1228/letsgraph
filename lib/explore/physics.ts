// Physics helpers for the React Flow graph engine (spike 2026-11-15, decisions D 20:56).
// Pure functions, no React: rectangle collision for pill-shaped nodes and a size estimate used
// until React Flow has measured the real node. d3-bboxCollide exists but is Unlicense (outside the
// licence gate), so this small force is written here instead (research-graph-design.md §4).
import type { SimulationNodeDatum } from "d3-force";

export type Box = { w: number; h: number };

/** Rough pixel width of a Korean/Latin label at a given font size (Pretendard). */
export function textWidth(text: string, fontPx: number): number {
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) w += fontPx * 0.98; // Hangul syllable
    else if (ch === " ") w += fontPx * 0.28;
    else if (/[0-9.,]/.test(ch)) w += fontPx * 0.56;
    else w += fontPx * 0.6;
  }
  return Math.ceil(w);
}

/**
 * Collision between axis-aligned rectangles centred on (x, y).
 * Overlapping pairs are pushed apart along the axis with the smaller overlap (cheapest separation).
 * O(n^2) per tick: fine below ~300 nodes, which is far above the graph's size (< 200).
 */
export function forceRectCollide<N extends SimulationNodeDatum & { id: string }>(size: (n: N) => Box, pad = 6, strength = 0.7) {
  let nodes: N[] = [];
  function force() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const sa = size(a);
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const sb = size(b);
        const dx = (b.x ?? 0) + (b.vx ?? 0) - ((a.x ?? 0) + (a.vx ?? 0));
        const dy = (b.y ?? 0) + (b.vy ?? 0) - ((a.y ?? 0) + (a.vy ?? 0));
        const ox = (sa.w + sb.w) / 2 + pad - Math.abs(dx);
        const oy = (sa.h + sb.h) / 2 + pad - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // a pinned node (fx/fy set while dragging) does not move; the other one takes the whole push
        const aFixed = a.fx != null, bFixed = b.fx != null;
        const shareA = aFixed ? 0 : bFixed ? 1 : 0.5;
        const shareB = 1 - shareA;
        if (ox < oy) {
          const s = (dx >= 0 ? 1 : -1) * ox * strength;
          a.vx = (a.vx ?? 0) - s * shareA;
          b.vx = (b.vx ?? 0) + s * shareB;
        } else {
          const s = (dy >= 0 ? 1 : -1) * oy * strength;
          a.vy = (a.vy ?? 0) - s * shareA;
          b.vy = (b.vy ?? 0) + s * shareB;
        }
      }
    }
  }
  force.initialize = (ns: N[]) => {
    nodes = ns;
  };
  return force;
}
