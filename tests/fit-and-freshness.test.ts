import { describe, expect, it } from "vitest";
import { careerFromText, careerNotice, careerRequirement } from "@/lib/posting/career";
import { cardsKey, isStale } from "@/lib/connect/freshness";
import { DEMO_ANALYSES, DEMO_POSTINGS } from "@/lib/data/fixtures";

describe("POST-06 경력 요건", () => {
  it("reads years and level from the qualification lines", () => {
    expect(careerFromText(["데이터 엔지니어링 경력 5년 이상"])).toEqual({ level: "experienced", minYears: 5 });
    expect(careerFromText(["3년 이상의 실무 경험"])).toEqual({ level: "experienced", minYears: 3 });
    expect(careerFromText(["[경력직] 회계 담당자"])).toEqual({ level: "experienced", minYears: null });
    expect(careerFromText(["신입/경력 무관"]).level).toBe("any");
    expect(careerFromText(["2027년 2월 졸업 예정 신입"])).toEqual({ level: "new", minYears: null });
    expect(careerFromText(["식품 관련 전공"]).level).toBe("unknown");
  });
  it("prefers what the AI read, falls back to the text for older analyses", () => {
    const base = DEMO_ANALYSES[DEMO_POSTINGS[0].id];
    expect(careerRequirement({ ...base, career: { level: "experienced", minYears: 2 } })).toEqual({ level: "experienced", minYears: 2 });
    expect(careerRequirement({ ...base, career: undefined, qualifications: ["외식업 경력 2년 이상"] })).toEqual({ level: "experienced", minYears: 2 });
  });
  it("warns only for experienced-hire postings", () => {
    expect(careerNotice({ level: "experienced", minYears: 5 })).toContain("경력 5년 이상");
    expect(careerNotice({ level: "experienced", minYears: null })).toContain("경력직 공고");
    expect(careerNotice({ level: "new", minYears: null })).toBeNull();
    expect(careerNotice({ level: "any", minYears: 3 })).toBeNull();
  });
});

describe("오래된 결과: 카드 지문", () => {
  it("does not depend on order, and changes when a card is added or removed", () => {
    const a = cardsKey([{ id: "e1" }, { id: "e2" }], [{ id: "a1" }]);
    expect(cardsKey([{ id: "e2" }, { id: "e1" }], [{ id: "a1" }])).toBe(a);
    expect(cardsKey([{ id: "e1" }, { id: "e2" }, { id: "e3" }], [{ id: "a1" }])).not.toBe(a);
    expect(cardsKey([{ id: "e1" }], [{ id: "a1" }])).not.toBe(a);
  });
  it("flags only results that carry a different fingerprint", () => {
    expect(isStale(undefined, "x")).toBe(false); // made before fingerprints existed
    expect(isStale("x", "x")).toBe(false);
    expect(isStale("x", "y")).toBe(true);
  });
});
