import { describe, expect, it } from "vitest";
import { buildGraph, groupOf, industryAngles, RING } from "@/lib/explore/graph";
import { COMPANIES, INDUSTRIES, JOB_LINKS, JOB_ROLES } from "@/lib/data/fixtures";

const role = (id: string) => JOB_ROLES.find((r) => r.id === id)!;
const base = { industries: INDUSTRIES, companies: COMPANIES, links: JOB_LINKS, saved: ["cj", "orion", "samyang"], vertical: false };

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

  it("hovering an industry lights its twins in other stars", () => {
    const g = buildGraph({ ...base, jobs: [role("quality"), role("overseas-sales")], expanded: null });
    const ind = g.nodes.find((n) => n.id === "ind:quality:food")!;
    const lit = groupOf(ind, g.nodes, (c) => COMPANIES.find((x) => x.id === c)!.industryId);
    expect(lit.has("ind:overseas-sales:food")).toBe(true);
    expect(lit.has("job:overseas-sales")).toBe(true);
  });
});
