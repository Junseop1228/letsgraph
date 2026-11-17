"use client";
// 말하는 사람 점 (design/DESIGN.md COL-8): one dot left of the newest message, orange for the coach and green for me.
// When the speaker changes it jumps along a short dotted arc and changes color on the way. Decorative (aria-hidden):
// the "AI 코치" / "나" labels carry the meaning. With reduced motion it moves without the jump or the trail.
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Pos = { x: number; y: number };
type Speaker = "coach" | "me";
type Props = { listRef: React.RefObject<HTMLElement | null>; index: number; speaker: Speaker };

const DOT = 10; // px, size-2.5
const GAP = 14; // px between the dot and the bubble

/** a point on the quadratic curve from a to b with control c */
const q = (a: Pos, c: Pos, b: Pos, t: number): Pos => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

export function SpeakerDot({ listRef, index, speaker }: Props) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const prev = useRef<Pos | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [trail, setTrail] = useState<{ d: string; speaker: Speaker; key: number } | null>(null);

  useLayoutEffect(() => {
    const bubble = listRef.current?.querySelector<HTMLElement>(`[data-bubble="${index}"]`);
    if (!bubble) return;
    const to = { x: bubble.offsetLeft - GAP - DOT, y: bubble.offsetTop + Math.min(22, bubble.offsetHeight / 2) - DOT / 2 };
    const from = prev.current;
    prev.current = to;
    setPos(to);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!from || reduce || (Math.abs(from.x - to.x) < 1 && Math.abs(from.y - to.y) < 1)) return;

    const c = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 36 }; // the top of the jump
    dotRef.current?.animate(
      [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const p = q(from, c, to, t);
        return { transform: `translate(${p.x}px, ${p.y}px)`, offset: t };
      }),
      { duration: 560, easing: "cubic-bezier(.35,.7,.4,1)" },
    );
    const h = DOT / 2;
    setTrail({ d: `M ${from.x + h} ${from.y + h} Q ${c.x + h} ${c.y + h} ${to.x + h} ${to.y + h}`, speaker, key: Date.now() });
    const timer = window.setTimeout(() => setTrail(null), 950);
    return () => window.clearTimeout(timer);
  }, [index, speaker, listRef]);

  return (
    <li aria-hidden className="pointer-events-none absolute left-0 top-0 list-none">
      {trail ? (
        <svg key={trail.key} className="absolute left-0 top-0 overflow-visible" width="1" height="1">
          <path
            d={trail.d}
            fill="none"
            stroke={trail.speaker === "coach" ? "var(--color-coach)" : "var(--color-me)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="1.5 5"
            className="animate-speaker-trail"
          />
        </svg>
      ) : null}
      <span
        ref={dotRef}
        className={cn("absolute left-0 top-0 block size-2.5 rounded-full transition-colors duration-300 motion-reduce:transition-none", speaker === "coach" ? "bg-coach" : "bg-me")}
        style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : { opacity: 0 }}
      />
    </li>
  );
}
