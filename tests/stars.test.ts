// Scenario names follow specs/explore/spec.md (FR-MAP-03 나의 취업 그래프).
import { describe, expect, it } from "vitest";
import { STAR_MAX_INDUSTRIES, pickIndustries, starLinks, withExtras } from "@/lib/explore/stars";
import { industryAngles, industryRadius } from "@/lib/explore/graph";
import type { JobLink } from "@/lib/contracts/domain";

const counts: Record<string, number> = {
  semiconductor: 150, electronics: 380, battery: 36, automotive: 140, "shipbuilding-aerospace": 42, machinery: 200,
  chemicals: 216, steel: 152, "bio-pharma": 411, food: 112, cosmetics: 50, energy: 66, construction: 133,
  "fashion-living": 132, retail: 169, logistics: 36, it: 310, game: 43, media: 135, finance: 163, holding: 134, services: 93,
};

describe("별마다 보여 줄 산업", () => {
  it("고른 산업이 없으면 핵심 산업부터, 기업이 많은 순으로 최대 8개", () => {
    const q = pickIndustries("quality", counts);
    expect(q).toHaveLength(STAR_MAX_INDUSTRIES);
    expect(q[0]).toBe("bio-pharma"); // core, most companies
    expect(q).toContain("food");
    expect(q).not.toContain("finance");
  });

  it("온보딩에서 고른 산업만 남기고, 관련 없는 것만 골랐으면 기본으로 돌아간다", () => {
    expect(pickIndustries("quality", counts, ["food", "semiconductor", "game"])).toEqual(["semiconductor", "food"]);
    expect(pickIndustries("quality", counts, ["game"])).toEqual(pickIndustries("quality", counts));
  });

  it("기업이 없는 산업은 빠진다", () => {
    expect(pickIndustries("semi-process", { semiconductor: 0, electronics: 5 })).toEqual(["electronics"]);
  });
});

describe("별의 연결", () => {
  const stored: JobLink[] = [
    { jobRoleId: "quality", companyId: "cj", basis: "posting" },
    { jobRoleId: "marketing", companyId: "amore", basis: "posting" },
  ];
  it("저장된 연결(실제 공고)이 먼저이고, 산업별 상위 기업은 추정으로 붙는다", () => {
    const ls = starLinks("quality", ["food"], { food: ["cj", "nongshim"] }, stored);
    expect(ls).toEqual([
      { jobRoleId: "quality", companyId: "cj", basis: "posting" },
      { jobRoleId: "quality", companyId: "nongshim", basis: "estimated" },
    ]);
  });

  it("검색으로 넣은 기업은 관련 있는 별에 붙고, 뺀 기업은 사라진다", () => {
    const base = starLinks("quality", ["food"], { food: ["cj", "nongshim"] }, stored);
    const out = withExtras(base, ["quality", "marketing"], [{ id: "sk", industryId: "semiconductor" }], ["nongshim"]);
    expect(out.some((l) => l.companyId === "nongshim")).toBe(false);
    expect(out.filter((l) => l.companyId === "sk").map((l) => l.jobRoleId)).toEqual(["quality"]); // marketing is not related to semiconductor
    const lone = withExtras([], ["finance-general"], [{ id: "x", industryId: "food" }], []);
    expect(lone).toEqual([{ jobRoleId: "finance-general", companyId: "x", basis: "estimated" }]); // no related star -> first star
  });
});

describe("그래프 배치", () => {
  it("그래프에 있는 산업만 원을 고르게 나눠 갖는다", () => {
    const a = industryAngles([{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }, { id: "d", name: "D" }]);
    expect(a).toEqual({ a: 270, b: 0, c: 90, d: 180 });
  });
  it("산업 원은 기업 수가 많을수록 크지만 완만하게 커진다", () => {
    expect(industryRadius(8)).toBeGreaterThan(14);
    expect(industryRadius(400)).toBeLessThan(28);
    expect(industryRadius(400)).toBeGreaterThan(industryRadius(8));
  });
});
