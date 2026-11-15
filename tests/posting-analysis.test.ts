import { describe, expect, it } from "vitest";
import { toPostingAnalysis } from "@/lib/posting/analysis";
import { PostingTextInput, type PostingAnalysisAiOutput } from "@/lib/contracts/activity";

const base: PostingAnalysisAiOutput = {
  postingFound: true,
  companyName: "예시식품",
  title: "품질관리 신입",
  deadline: "2026-11-30",
  duties: ["원재료 입고 검사"],
  qualifications: ["식품 관련 전공"],
  preferred: [],
  competencies: [{ name: "꼼꼼함", basis: "inferred", evidence: "입고 검사" }],
  cautions: [],
};

describe("FR-POST-01 공고 본문 없음", () => {
  it("keeps a result that has a posting body, without the postingFound flag", () => {
    const out = toPostingAnalysis(base);
    expect(out?.title).toBe("품질관리 신입");
    expect(out && "postingFound" in out).toBe(false);
  });
  it("drops the result when the AI found no posting body", () => {
    expect(toPostingAnalysis({ ...base, postingFound: false })).toBeNull();
  });
  it("drops the result when duties or competencies are empty even if postingFound is true", () => {
    expect(toPostingAnalysis({ ...base, duties: [] })).toBeNull();
    expect(toPostingAnalysis({ ...base, competencies: [] })).toBeNull();
  });
});

describe("POST-04 너무 짧거나 긴 글", () => {
  it("accepts a posting-sized text and trims it", () => {
    const r = PostingTextInput.safeParse(`  ${"주요 업무와 자격 요건 ".repeat(10)}  `);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.startsWith("주요")).toBe(true);
  });
  it("refuses too short, too long and missing text", () => {
    expect(PostingTextInput.safeParse("짧은 글").success).toBe(false);
    expect(PostingTextInput.safeParse("가".repeat(20_001)).success).toBe(false);
    expect(PostingTextInput.safeParse(null).success).toBe(false);
  });
});
