import { describe, expect, it } from "vitest";
import { allocation, cleanQuestions, ESSAY_GUIDE, planEssay } from "@/lib/kit/questions";
import { EssayQuestion, Experience, type ConnectionOutput } from "@/lib/contracts/activity";
import { DEMO_ACTIVITIES } from "@/lib/data/fixtures";

const q = (id: string, type: EssayQuestion["type"], maxChars: number | null = null, minChars: number | null = null): EssayQuestion =>
  EssayQuestion.parse({ id, text: `문항 ${id}`, maxChars, minChars, type });

describe("FR-PREM-04 지원서 문항 읽기", () => {
  it("drops 필수 marks and lines that are not questions, keeps limits sane, at most 10", () => {
    const out = cleanQuestions({
      questions: [
        { text: "필수  [대한통운] 해당 내용을 포함하여 경력기술서를 작성해주세요.", maxChars: 5000, minChars: 500, type: "career" },
        { text: "짧음", maxChars: null, minChars: null, type: "other" },
        { text: "직장 경험 중 가장 큰 성과를 냈던 일과 본인의 강점", maxChars: 5000, minChars: 9000, type: "achievement" },
      ],
    });
    expect(out.map((x) => [x.id, x.text, x.maxChars, x.minChars, x.type])).toEqual([
      ["q1", "[대한통운] 해당 내용을 포함하여 경력기술서를 작성해주세요.", 5000, 500, "career"],
      ["q2", "직장 경험 중 가장 큰 성과를 냈던 일과 본인의 강점", 5000, null, "achievement"], // min above max is dropped
    ]);
    expect(cleanQuestions({ questions: Array.from({ length: 12 }, (_, i) => ({ text: `문항입니다 ${i}`, maxChars: null, minChars: null, type: "other" as const })) })).toHaveLength(10);
  });
  it("turns the step plan into characters from the real limit", () => {
    expect(allocation(ESSAY_GUIDE.problem, 5000)).toBe("S 상황 20% (약 1,000자), T 역할·과제 15% (약 750자), A 행동 40% (약 2,000자), R 결과·배운 점 25% (약 1,250자)");
    expect(allocation(ESSAY_GUIDE.problem, null)).toBe("S 상황 20%, T 역할·과제 15%, A 행동 40%, R 결과·배운 점 25%");
    expect(allocation(ESSAY_GUIDE.career, 5000)).toContain("항목");
  });
});

describe("FR-PREM-04 문항별 재료", () => {
  const ep = (id: string, theme: Experience["theme"], result = "r"): Experience =>
    Experience.parse({ id, title: id, kind: "parttime", theme, situation: "s", action: "a", result, competencies: [] });
  it("성과·강점 prefers a result with numbers; 경력기술서 uses work activities and asks for what the kit does not know", () => {
    const episodes = [ep("plain", "problem", "좋아졌어요"), ep("numbers", "problem", "폐기 주 6개에서 2개로"), ep("team", "collab")];
    const plan = planEssay([q("q1", "career", 5000, 500), q("q2", "achievement", 5000), q("q3", "collab")], episodes, DEMO_ACTIVITIES, null);
    expect(plan[0].episode).toBeNull();
    expect(plan[0].activities.map((a) => a.id)).toEqual(["act-cafe"]); // 아르바이트 = work
    expect(plan[0].ask).toContain("부서·직급");
    expect(plan[1].episode?.id).toBe("numbers");
    expect(plan[2].episode?.id).toBe("team");
  });
  it("never gives the same episode to two questions", () => {
    const plan = planEssay([q("a", "problem"), q("b", "problem")], [ep("only", "problem")], [], { links: [], gaps: [] } as ConnectionOutput);
    expect(plan.map((p) => p.episode?.id ?? null)).toEqual(["only", null]);
  });
});
