import { describe, expect, it } from "vitest";
import { isCompanyType, matchesType, reasonLine } from "@/lib/explore/company-type";

describe("company type (회사 성격)", () => {
  it("sorts companies by revenue size and 3-year growth", () => {
    expect(matchesType({ revenue: 12_000, revenueGrowth: 0 }, "large")).toBe(true);
    expect(matchesType({ revenue: 9_999, revenueGrowth: 0 }, "large")).toBe(false);
    expect(matchesType({ revenue: 5_000, revenueGrowth: null }, "mid")).toBe(true);
    expect(matchesType({ revenue: 10_000, revenueGrowth: null }, "mid")).toBe(false);
    expect(matchesType({ revenue: 300, revenueGrowth: 0.2 }, "growing")).toBe(true);
    expect(matchesType({ revenue: 50, revenueGrowth: 0.9 }, "growing")).toBe(false);
    expect(matchesType({ revenue: 300, revenueGrowth: null }, "growing")).toBe(false);
    expect(matchesType({ revenue: null, revenueGrowth: 0.5 }, "large")).toBe(false);
  });
  it("accepts only the three cookie values", () => {
    expect(isCompanyType("mid")).toBe(true);
    expect(isCompanyType("any")).toBe(false);
    expect(isCompanyType(undefined)).toBe(false);
  });
});

describe("reasonLine", () => {
  const base = { jobName: "품질관리", industryName: "식품", growth: null, relaxed: false } as const;
  it("names the industry rank, filtered or not", () => {
    expect(reasonLine({ ...base, basis: "estimated", rank: 2, type: null })).toBe("식품 매출 2위");
    expect(reasonLine({ ...base, basis: "estimated", rank: 1, type: "mid" })).toBe("식품 탄탄한 중견 중 매출 1위");
  });
  it("puts posting evidence first and shows growth for growing companies", () => {
    expect(reasonLine({ ...base, basis: "posting", rank: null, type: null })).toBe("품질관리 실제 공고가 확인된 회사");
    expect(reasonLine({ ...base, basis: "estimated", rank: 3, type: "growing", growth: 0.234 })).toBe(
      "식품 빠르게 크는 회사 중 매출 3위 · 최근 3년 매출 해마다 +23%",
    );
  });
  it("says when the filter was relaxed", () => {
    expect(reasonLine({ ...base, basis: "estimated", rank: 1, type: "large", relaxed: true })).toBe("식품 매출 1위 · 조건을 조금 넓혀 보여드려요");
  });
  it("falls back to the industry when the company has no rank (added by hand)", () => {
    expect(reasonLine({ ...base, basis: "estimated", rank: null, type: null })).toBe("품질관리 관련 산업인 식품");
  });
});
