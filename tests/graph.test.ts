import { describe, expect, it } from "vitest";
import { anchors, buildGraph, CO_STEP, FOCUS_GAP, groupOf, industryAngles, RING } from "@/lib/explore/graph";
import { COMPANIES, INDUSTRIES, JOB_LINKS, JOB_ROLES } from "@/lib/data/fixtures";

const role = (id: string) => JOB_ROLES.find((r) => r.id === id)!;
const base = { industries: INDUSTRIES, companies: COMPANIES, links: JOB_LINKS, saved: ["cj", "orion", "samyang"], vertical: false };
type At = { tx: number; ty: number };
const angleOf = (n: At, c: At) => ((((Math.atan2(n.ty - c.ty, n.tx - c.tx) * 180) / Math.PI) % 360) + 360) % 360;
const apart = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe("FR-MAP-03 나의 취업 그래프 (직무별 별자리)", () => {
  it("one star per job, industries at the same angle in every star", () => {
    const g = buildGraph({ ...base, jobs: [role("quality"), role("overseas-sales")], expanded: null });
    expect(g.nodes.filter((n) => n.type === "center")).toHaveLength(2);
    const angles = industryAngles(INDUSTRIES);
    for (const n of g.nodes.filter((x) => x.type === "ind")) {
      const center = g.nodes.find((c) => c.id === `job:${n.job}`)!;
      const a = (Math.atan2(n.ty - center.ty, n.tx - center.tx) * 180) / Math.PI;
      expect(Math.round(((a % 360) + 360) % 360)).toBe(angles[n.ref] % 360);
      expect(Math.round(Math.hypot(n.tx - center.tx, n.ty - center.ty))).toBe(RING);
    }
  });

  it("an industry two stars share is drawn once per star and nothing links the stars (D 2026-11-17)", () => {
    const g = buildGraph({ ...base, jobs: [role("quality"), role("overseas-sales")], expanded: null });
    const food = g.nodes.filter((n) => n.type === "ind" && n.ref === "food");
    expect(food).toHaveLength(2);
    expect("bridges" in g).toBe(false);
    const starOf = (id: string) => g.nodes.find((n) => n.id === id)!.job;
    expect(g.links.every((l) => starOf(l.source) === starOf(l.target))).toBe(true);
  });

  it("companies only when an industry is opened; saved companies always", () => {
    const closed = buildGraph({ ...base, jobs: [role("quality")], expanded: null });
    expect(closed.nodes.filter((n) => n.type === "co").map((n) => n.ref).sort()).toEqual(["cj", "orion", "samyang"]);
    const open = buildGraph({ ...base, jobs: [role("quality")], expanded: "quality|food" });
    const foodCos = open.nodes.filter((n) => n.type === "co");
    expect(foodCos.length).toBe(8); // capped at PER_IND_CAP
    expect(open.links.some((l) => l.kind === "ind-co-est")).toBe(true);
  });

  it("opening an industry focuses its star: the others dim and bunch up on the far side, the companies share the free sector (D 2026-11-17)", () => {
    const g = buildGraph({ ...base, jobs: [role("quality")], expanded: "quality|food" });
    const c = g.nodes.find((n) => n.id === "job:quality")!;
    const opened = g.nodes.find((n) => n.id === "ind:quality:food")!;
    const others = g.nodes.filter((n) => n.type === "ind" && n.id !== opened.id);
    expect(others).toHaveLength(2);
    expect(others.every((n) => n.dim)).toBe(true);
    expect(opened.dim).toBeFalsy();
    expect(g.links.filter((l) => l.kind === "job-ind" && l.dim)).toHaveLength(2);
    const phi = angleOf(opened, c);
    for (const o of others) expect(apart(angleOf(o, c), phi)).toBeGreaterThanOrEqual(FOCUS_GAP);
    const cos = g.nodes.filter((n) => n.type === "co");
    expect(cos).toHaveLength(8);
    for (const n of cos) expect(apart(angleOf(n, c), phi)).toBeLessThanOrEqual(((cos.length - 1) / 2) * CO_STEP + 0.01);
    // nothing is dimmed while no industry is open
    const closed = buildGraph({ ...base, jobs: [role("quality")], expanded: null });
    expect(closed.nodes.some((n) => n.dim) || closed.links.some((l) => l.dim)).toBe(false);
  });

  it("with two stars the unfolded industry points away from the other star and the other star stays as it was", () => {
    const jobs = [role("quality"), role("overseas-sales")];
    const g = buildGraph({ ...base, jobs, expanded: "overseas-sales|food" });
    const c = g.nodes.find((n) => n.id === "job:overseas-sales")!; // the right-hand star
    const opened = g.nodes.find((n) => n.id === "ind:overseas-sales:food")!;
    expect(apart(angleOf(opened, c), 0)).toBeLessThan(1);
    const cos = g.nodes.filter((n) => n.type === "co" && n.job === "overseas-sales");
    expect(cos.length).toBeGreaterThan(0);
    expect(cos.every((n) => n.tx > c.tx)).toBe(true);
    const idle = buildGraph({ ...base, jobs, expanded: null });
    const pick = (d: typeof g) => d.nodes.filter((n) => n.job === "quality" && n.type !== "co").map((n) => `${n.id}:${Math.round(n.tx)}:${Math.round(n.ty)}:${!!n.dim}`);
    expect(pick(g)).toEqual(pick(idle));
  });

  it("stars sit far enough apart that two never touch (D 2026-11-17)", () => {
    for (const vertical of [false, true])
      for (let n = 2; n <= 5; n++) {
        const a = anchors(n, vertical);
        for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) expect(Math.hypot(a[x][0] - a[y][0], a[x][1] - a[y][1])).toBeGreaterThanOrEqual(420);
      }
  });

  it("hovering an industry lights its twins in other stars", () => {
    const g = buildGraph({ ...base, jobs: [role("quality"), role("overseas-sales")], expanded: null });
    const ind = g.nodes.find((n) => n.id === "ind:quality:food")!;
    const lit = groupOf(ind, g.nodes, (c) => COMPANIES.find((x) => x.id === c)!.industryId);
    expect(lit.has("ind:overseas-sales:food")).toBe(true);
    expect(lit.has("job:overseas-sales")).toBe(true);
  });
});
