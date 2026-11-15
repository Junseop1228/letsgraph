import { describe, expect, it } from "vitest";
import { forceSimulation } from "d3-force";
import { forceRectCollide, textWidth } from "@/lib/explore/physics";

type N = { id: string; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null };

describe("forceRectCollide", () => {
  it("separates overlapping pills along the cheaper axis", () => {
    const nodes: N[] = [{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 4 }];
    const sim = forceSimulation(nodes).force("c", forceRectCollide<N>(() => ({ w: 100, h: 28 }), 6, 0.7)).stop();
    for (let i = 0; i < 80; i++) sim.tick();
    const dy = Math.abs((nodes[1].y ?? 0) - (nodes[0].y ?? 0));
    const dx = Math.abs((nodes[1].x ?? 0) - (nodes[0].x ?? 0));
    expect(dy >= 28 + 6 - 0.5 || dx >= 100 + 6 - 0.5).toBe(true);
    expect(dx).toBeLessThan(100); // vertical overlap was smaller, so they split vertically
  });

  it("leaves a pinned (dragged) node in place", () => {
    const nodes: N[] = [{ id: "a", x: 0, y: 0, fx: 0, fy: 0 }, { id: "b", x: 0, y: 5 }];
    const sim = forceSimulation(nodes).force("c", forceRectCollide<N>(() => ({ w: 60, h: 28 }), 6, 0.7)).stop();
    for (let i = 0; i < 60; i++) sim.tick();
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
    expect(Math.abs(nodes[1].y ?? 0)).toBeGreaterThanOrEqual(33);
  });
});

describe("textWidth", () => {
  it("counts Hangul wider than digits", () => {
    expect(textWidth("식품", 14)).toBeGreaterThan(textWidth("12", 14));
  });
});
