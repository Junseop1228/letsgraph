// Scenario names follow specs/explore/spec.md (기업 고르기: 공고 근거).
import { describe, expect, it } from "vitest";
import { reasonLine } from "@/lib/explore/company-type";
import { JOB_LINKS } from "@/lib/data/fixtures";

describe("기업 고르기: 공고 근거", () => {
  const base = { jobName: "물류·무역", industryName: "물류", rank: 2, growth: null, type: null, relaxed: false };

  it("확인된 공고 수를 이유 줄에 적는다", () => {
    expect(reasonLine({ ...base, basis: "posting", postings: 2 })).toBe("물류·무역 공고 2건으로 확인된 회사 · 물류 매출 2위");
    expect(reasonLine({ ...base, basis: "posting" })).toBe("물류·무역 실제 공고가 확인된 회사 · 물류 매출 2위");
    expect(reasonLine({ ...base, basis: "estimated" })).toBe("물류 매출 2위");
  });

  it("데모 데이터에는 확인된 공고가 없으므로 '실제 공고' 연결도 없다", () => {
    expect(JOB_LINKS.filter((l) => l.basis === "posting")).toEqual([]);
  });
});
