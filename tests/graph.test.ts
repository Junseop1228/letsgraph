import { describe, expect, it } from "vitest";
import { anchors, buildGraph, groupOf, RING, type GNode } from "@/lib/explore/graph";
import { COMPANIES, INDUSTRIES, JOB_LINKS, JOB_ROLES } from "@/lib/data/fixtures";

const role = (id: string) => JOB_ROLES.find((r) => r.id === id)!;
const base = { industries: INDUSTRIES, companies: COMPANIES, links: JOB_LINKS, saved: ["cj", "orion", "samyang"], vertical: false };
type At = { tx: number; ty: number };
const angleOf = (n: At, c: At) => ((((Math.atan2(n.ty - c.ty, n.tx - c.tx) * 180) / Math.PI) % 360) + 360) % 360;
const apart = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
const dist = (a: At, b: At) => Math.hypot(a.tx - b.tx, a.ty - b.ty);
const mod360 = (a: number) => ((a % 360) + 360) % 360;
const find = (nodes: GNode[], id: string) => nodes.find((n) => n.id === id)!;

describe("FR-MAP-03 나의 취업 그래프 (직무별 별자리)", () => {
  it("a star alone keeps a full ring: its industries evenly around the job at RING", () => {
    const g = buildGraph({ ...base, jobs: [role("quality")], expanded: null });
    const c = find(g.nodes, "job:quality");
    const inds = g.nodes.filter((n) => n.type === "ind");
    expect(inds).toHaveLength(3);
    for (const n of inds) expect(Math.round(dist(n, c))).toBe(RING);
    const a = inds.map((n) => angleOf(n, c)).sort((x, y) => x - y);
    expect(Math.round(a[1] - a[0])).toBe(120);
    expect(Math.round(a[2] - a[1])).toBe(120);
  });

  it("with several stars each star fans its industries out away from the others, in the same order (D 2026-11-17 sketch)", () => {
    const g = buildGraph({ ...base, jobs: [role("quality"), role("overseas-sales")], expanded: null });
    const left = find(g.nodes, "job:quality"), right = find(g.nodes, "job:overseas-sales");
    expect(left.tx).toBeLessThan(right.tx);
    for (const n of g.nodes.filter((x) => x.type === "ind")) {
      const c = n.job === "quality" ? left : right;
      expect(Math.sign(n.tx - c.tx)).toBe(n.job === "quality" ? -1 : 1);
    }
    for (const [job, c] of [["quality", left], ["overseas-sales", right]] as const) {
      const at = (ind: string) => angleOf(find(g.nodes, `ind:${job}:${ind}`), c);
      expect(Math.round(mod360(at("bio-pharma") - at("food")))).toBe(60);
      expect(Math.round(mod360(at("cosmetics") - at("bio-pharma")))).toBe(60);
    }
  });

  it("companies only when an industry is opened; saved companies always", () => {
    const closed = buildGraph({ ...base, jobs: [role("quality")], expanded: null });
    expect(closed.nodes.filter((n) => n.type === "co").map((n) => n.ref).sort()).toEqual(["cj", "orion", "samyang"]);
    const open = buildGraph({ ...base, jobs: [role("quality")], expanded: "quality|food" });
    const foodCos = open.nodes.filter((n) => n.type === "co");
    expect(foodCos.length).toBe(8); // capped at PER_IND_CAP
    expect(open.links.some((l) => l.kind === "ind-co-est")).toBe(true);
  });

  it("an opened industry: its companies form one tight block right behind it, nothing moves, the star's other industries dim (D 2026-11-17)", () => {
    const closed = buildGraph({ ...base, jobs: [role("quality")], expanded: null });
    const open = buildGraph({ ...base, jobs: [role("quality")], expanded: "quality|food" });
    const places = (d: typeof open) => d.nodes.filter((n) => n.type !== "co").map((n) => `${n.id}:${Math.round(n.tx)}:${Math.round(n.ty)}`);
    expect(places(open)).toEqual(places(closed));
    const c = find(open.nodes, "job:quality");
    const ind = find(open.nodes, "ind:quality:food");
    const cos = open.nodes.filter((n) => n.type === "co");
    expect(cos).toHaveLength(8);
    for (const n of cos) {
      expect(dist(n, c)).toBeGreaterThan(dist(ind, c)); // behind the industry, seen from the job
      expect(apart(angleOf(n, ind), angleOf(ind, c))).toBeLessThan(70);
      expect(dist(n, ind)).toBeLessThan(400);
    }
    // one group: every member has another member close by, so the plane around them does not split
    const members = [ind, ...cos];
    for (const m of members) expect(Math.min(...members.filter((x) => x !== m).map((x) => dist(x, m)))).toBeLessThan(150);
    const others = open.nodes.filter((n) => n.type === "ind" && n.id !== ind.id);
    expect(others.every((n) => n.dim)).toBe(true);
    expect(ind.dim).toBeFalsy();
    expect(open.links.filter((l) => l.kind === "job-ind" && l.dim)).toHaveLength(2);
    expect(closed.nodes.some((n) => n.dim) || closed.links.some((l) => l.dim)).toBe(false);
  });

  it("with two stars, opening an industry in one leaves the other star as it was", () => {
    const jobs = [role("quality"), role("overseas-sales")];
    const g = buildGraph({ ...base, jobs, expanded: "overseas-sales|food" });
    const idle = buildGraph({ ...base, jobs, expanded: null });
    const pick = (d: typeof g) => d.nodes.filter((n) => n.job === "quality").map((n) => `${n.id}:${Math.round(n.tx)}:${Math.round(n.ty)}:${!!n.dim}`);
    expect(pick(g)).toEqual(pick(idle));
    const c = find(g.nodes, "job:overseas-sales");
    const ind = find(g.nodes, "ind:overseas-sales:food");
    const cos = g.nodes.filter((n) => n.type === "co" && n.job === "overseas-sales");
    expect(cos.length).toBeGreaterThan(0);
    for (const n of cos) expect(dist(n, c)).toBeGreaterThan(dist(ind, c));
  });

  it("with three stars, an opened block never heads toward another star: each company stays nearest its own job", () => {
    const jobs = [role("quality"), role("production-mgmt"), role("overseas-sales")];
    const idle = buildGraph({ ...base, saved: [], jobs, expanded: null });
    const centres = idle.nodes.filter((n) => n.type === "center");
    for (const ind of idle.nodes.filter((n) => n.type === "ind")) {
      const g = buildGraph({ ...base, saved: [], jobs, expanded: `${ind.job}|${ind.ref}` });
      const own = centres.find((c) => c.job === ind.job)!;
      for (const co of g.nodes.filter((n) => n.type === "co"))
        for (const other of centres.filter((c) => c !== own)) expect(dist(co, own)).toBeLessThan(dist(co, other));
    }
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
