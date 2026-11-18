"use client";
// 말하는 사람 점 (design/DESIGN.md COL-8): one dot left of the newest message, orange for the coach and green for me.
// When the speaker changes it jumps along a short dotted arc and changes color on the way. Decorative (aria-hidden):
// the "AI 코치" / "나" labels carry the meaning. With reduced motion it moves without the jump or the trail.
// Position and trail are written to the DOM directly (no React state): they follow the layout, not the data.
import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Pos = { x: number; y: number };
type Speaker = "coach" | "me";
type Props = { listRef: React.RefObject<HTMLElement | null>; index: number; speaker: Speaker };

const DOT = 10; // px, size-2.5
const GAP = 14; // px between the dot and the bubble
const near = (a: Pos, b: Pos) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;

/** a point on the quadratic curve from a to b with control c */
const q = (a: Pos, c: Pos, b: Pos, t: number): Pos => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

/** where the dot sits next to a bubble (offsets inside the positioned list) */
const place = (bubble: HTMLElement): Pos => ({
  x: bubble.offsetLeft - GAP - DOT,
  y: bubble.offsetTop + Math.min(22, bubble.offsetHeight / 2) - DOT / 2,
});

export function SpeakerDot({ listRef, index, speaker }: Props) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const prev = useRef<Pos | null>(null);

  // The list is this component's parent: on the first render its ref is attached only after this component's layout
  // effect, so listRef.current was still null and the dot stayed hidden until the next message. Find it from the dot.
  const list = () => listRef.current ?? dotRef.current?.closest<HTMLElement>("ol") ?? null;
  const show = (p: Pos) => {
    const el = dotRef.current;
    if (!el) return;
    el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    el.style.opacity = "1";
  };

  useLayoutEffect(() => {
    const bubble = list()?.querySelector<HTMLElement>(`[data-bubble="${index}"]`);
    if (!bubble) return;
    const to = place(bubble);
    const from = prev.current;
    prev.current = to;
    show(to);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!from || reduce || near(from, to)) return;

    const c = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 36 }; // the top of the jump
    dotRef.current?.animate(
      [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const p = q(from, c, to, t);
        return { transform: `translate(${p.x}px, ${p.y}px)`, offset: t };
      }),
      { duration: 560, easing: "cubic-bezier(.35,.7,.4,1)" },
    );
    const path = pathRef.current;
    if (path) {
      const h = DOT / 2;
      path.setAttribute("d", `M ${from.x + h} ${from.y + h} Q ${c.x + h} ${c.y + h} ${to.x + h} ${to.y + h}`);
      path.setAttribute("stroke", speaker === "coach" ? "var(--color-coach)" : "var(--color-me)");
      path.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { opacity: 0 }], { duration: 950, easing: "ease-out", fill: "forwards" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list() and show() read refs only
  }, [index, speaker, listRef]);

  // Keep the dot beside its bubble when the layout changes (phone rotation, window width, late fonts), without a jump.
  useEffect(() => {
    const root = list();
    if (!root) return;
    const ro = new ResizeObserver(() => {
      const bubble = root.querySelector<HTMLElement>(`[data-bubble="${index}"]`);
      if (!bubble) return;
      const to = place(bubble);
      if (prev.current && near(prev.current, to)) return;
      prev.current = to;
      show(to);
    });
    ro.observe(root);
    root.querySelectorAll<HTMLElement>("[data-bubble]").forEach((el) => ro.observe(el));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list() and show() read refs only
  }, [index, listRef]);

  return (
    <li aria-hidden className="pointer-events-none absolute left-0 top-0 list-none">
      <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1">
        <path ref={pathRef} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 5" className="opacity-0" />
      </svg>
      <span
        ref={dotRef}
        className={cn("absolute left-0 top-0 block size-2.5 rounded-full opacity-0 transition-colors duration-300 motion-reduce:transition-none", speaker === "coach" ? "bg-coach" : "bg-me")}
      />
    </li>
  );
}
