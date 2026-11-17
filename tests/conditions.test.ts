// Scenario names follow specs/explore/spec.md (산업 고르기, 조건 바꾸기).
import { describe, expect, it } from "vitest";
import { conditionSummary, jobsOutsideChoice, relatedIndustries, relaxNotes } from "@/lib/explore/conditions";

describe("산업 고르기 / 조건 바꾸기: 산업 칩 목록", () => {
  const inds = [
    { id: "finance", name: "금융", count: 90 },
    { id: "energy", name: "에너지", count: 40 },
    { id: "food", name: "식품", count: 10 },
    { id: "cosmetics", name: "화장품", count: 0 },
  ];

  it("관심 직무와 이어진 산업만, 관련도가 높은 순 다음 기업 수 순", () => {
    // quality: food = core, energy = common, finance = not related; cosmetics has no reviewed company
    expect(relatedIndustries(["quality"], inds).map((i) => i.id)).toEqual(["food", "energy"]);
  });

  it("여러 직무면 가장 높은 관련도로 줄 세우고, 최대 개수를 지킨다", () => {
    // finance (job) relates to every industry, finance industry = core
    expect(relatedIndustries(["quality", "finance"], inds).map((i) => i.id)).toEqual(["finance", "food", "energy"]);
    expect(relatedIndustries(["quality", "finance"], inds, 2)).toHaveLength(2);
  });

  it("관심 직무가 없으면 칩도 없다", () => {
    expect(relatedIndustries([], inds)).toEqual([]);
  });
});

describe("조건 바꾸기: 칩 글자와 넓힌 조건", () => {
  it("칩 글자", () => {
    expect(conditionSummary(0, null)).toBe("조건");
    expect(conditionSummary(2, "large")).toBe("산업 2 · 큰 회사");
    expect(conditionSummary(0, "growing")).toBe("성장 기업");
    expect(conditionSummary(3, null)).toBe("산업 3");
  });

  it("고른 산업과 이어지지 않는 직무만 골라낸다", () => {
    const counts = { food: 10, retail: 5, finance: 90 };
    expect(jobsOutsideChoice(["quality", "finance"], counts, ["retail"])).toEqual(["quality"]);
    expect(jobsOutsideChoice(["quality"], counts, ["food"])).toEqual([]);
    expect(jobsOutsideChoice(["quality"], counts, null)).toEqual([]);
    // an unknown job has no related industry: not counted
    expect(jobsOutsideChoice(["nope"], counts, ["retail"])).toEqual([]);
  });

  it("넓힌 조건을 한 줄씩 알린다", () => {
    expect(relaxNotes({ relaxedIndustries: [], outsideJobs: [], type: "mid" })).toEqual([]);
    expect(relaxNotes({ relaxedIndustries: ["식품"], outsideJobs: [], type: "mid" })).toEqual(["식품: 중견 조건에 맞는 회사가 없어 전체를 보여줘요"]);
    expect(relaxNotes({ relaxedIndustries: ["식품"], outsideJobs: ["품질관리"], type: null })).toEqual(["품질관리: 고른 산업과 이어지지 않아 가까운 산업을 보여줘요"]);
  });
});
