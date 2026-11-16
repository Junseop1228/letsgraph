import { describe, expect, it } from "vitest";
import { applyMatches, planEssay } from "@/lib/kit/questions";
import { buildPromptKit, kitToText } from "@/lib/kit/build";
import { EssayQuestion, Experience } from "@/lib/contracts/activity";
import { DEMO_ACTIVITIES, DEMO_ANALYSES, DEMO_CONNECTIONS, DEMO_EXPERIENCES, DEMO_POSTINGS } from "@/lib/data/fixtures";

const q = (id: string, type: EssayQuestion["type"], extra: Partial<EssayQuestion> = {}): EssayQuestion =>
  EssayQuestion.parse({ id, text: `문항 ${id}`, maxChars: 1000, minChars: null, type, ...extra });
const ep = (id: string, theme?: Experience["theme"]): Experience =>
  Experience.parse({ id, title: `에피소드 ${id}`, kind: "club", theme, situation: "s", action: "a", result: "r", competencies: [] });
const episodes = [ep("e1", "problem"), ep("e2", "collab"), ep("e3", "growth")];

describe("FR-PREM-05 문항 ↔ 에피소드 (AI 결과 다듬기)", () => {
  it("keeps known episodes, at most 2, and never gives one episode to two questions", () => {
    const out = applyMatches([q("q1", "problem"), q("q2", "other"), q("q3", "collab")], {
      matches: [
        { questionId: "q1", episodeIds: ["e2", "e1", "e3"], why: "고객과 갈등을 푼 장면", need: null },
        { questionId: "q2", episodeIds: ["e2", "nope"], why: "중복", need: null },
        { questionId: "q3", episodeIds: [], why: "", need: "팀원과 의견이 갈린 장면" },
      ],
    }, episodes);
    expect(out.map((x) => [x.id, x.episodeIds, x.fit ?? null, x.need ?? null])).toEqual([
      ["q1", ["e2", "e1"], "고객과 갈등을 푼 장면", null],
      ["q2", [], null, null],
      ["q3", [], null, "팀원과 의견이 갈린 장면"],
    ]);
  });
  it("keeps the user's own choices and their episodes away from other questions; 경력기술서 stays on activities", () => {
    const out = applyMatches(
      [q("q1", "problem", { episodeIds: ["e1"], manual: true }), q("q2", "problem"), q("q3", "career")],
      { matches: [{ questionId: "q2", episodeIds: ["e1", "e3"], why: "w", need: null }, { questionId: "q3", episodeIds: ["e2"], why: "w", need: null }] },
      episodes,
    );
    expect(out[0]).toMatchObject({ episodeIds: ["e1"], manual: true });
    expect(out[1].episodeIds).toEqual(["e3"]);
    expect(out[2].episodeIds).toEqual([]);
  });
  it("the plan uses matched episodes first, even across themes; unmatched questions fall back to the theme rule", () => {
    const plan = planEssay([q("q1", "problem", { episodeIds: ["e3"] }), q("q2", "collab"), q("q3", "growth", { episodeIds: [] })], episodes, [], null);
    expect(plan.map((p) => p.episode?.id ?? null)).toEqual(["e3", "e2", null]);
  });
});

describe("FR-PREM-05 키트의 문항 가이드", () => {
  it("names the matched episode, why it fits, a second one, and the missing scene", () => {
    const posting = {
      ...DEMO_POSTINGS[0],
      questions: [
        q("q1", "problem", { episodeIds: ["exp-stock", "exp-bug"], fit: "기록으로 폐기를 줄인 장면이 문제 해결에 답해요." }),
        q("q2", "growth", { episodeIds: [], need: "가치관이 바뀐 결정적인 장면" }),
      ],
    };
    const text = kitToText(buildPromptKit({ posting, analysis: DEMO_ANALYSES[posting.id], connection: DEMO_CONNECTIONS[posting.id], experiences: DEMO_EXPERIENCES, activities: DEMO_ACTIVITIES }));
    expect(text).toMatch(/- 쓸 에피소드: \d번 "재고 폐기 줄이기", 함께 쓸 에피소드: \d번 "백엔드 장애 대응"/);
    expect(text).toContain("- 이 에피소드인 이유: 기록으로 폐기를 줄인 장면이 문제 해결에 답해요.");
    expect(text).toContain("- 맞는 에피소드가 아직 없어요. 필요한 장면: 가치관이 바뀐 결정적인 장면");
  });
});
