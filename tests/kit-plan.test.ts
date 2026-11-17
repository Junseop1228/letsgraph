import { describe, expect, it } from "vitest";
import { findEpisode, planQuestions, QUESTION_GUIDE } from "@/lib/kit/plan";
import { Experience, type ConnectionOutput } from "@/lib/contracts/activity";

const ep = (id: string, theme?: "problem" | "collab" | "growth" | "motive", extra: Partial<Experience> = {}): Experience =>
  Experience.parse({ id, title: `에피소드 ${id}`, kind: "project", theme, situation: "s", action: "a", result: "r", competencies: [], ...extra });

describe("FR-PREM-03 문항 배정", () => {
  it("gives each question type one main episode by theme, linked episodes first, never the same episode twice", () => {
    const episodes = [ep("p1", "problem"), ep("p2", "problem"), ep("c1", "collab"), ep("g1", "growth")];
    const connection: ConnectionOutput = { links: [{ competency: "분석", experienceId: "p2", experienceTitle: "에피소드 p2", reason: "r" }], gaps: [] };
    const plan = planQuestions(episodes, connection);
    expect(plan.map((p) => [p.guide.theme, p.episode?.id ?? null])).toEqual([
      ["problem", "p2"],
      ["collab", "c1"],
      ["growth", "g1"],
      ["motive", null],
    ]);
  });
  it("lets an episode without a theme serve 직무 역량 only", () => {
    const plan = planQuestions([ep("old")], null);
    expect(plan[0].episode?.id).toBe("old");
    expect(plan.slice(1).every((p) => p.episode === null)).toBe(true);
  });
  it("finds a linked episode by id, or by title for older links", () => {
    const episodes = [ep("a1"), ep("a2")];
    expect(findEpisode(episodes, { experienceId: "a2", experienceTitle: "아무거나" })?.id).toBe("a2");
    expect(findEpisode(episodes, { experienceTitle: "에피소드 a1" })?.id).toBe("a1");
    expect(findEpisode(episodes, { experienceTitle: "없음" })).toBeNull();
  });
  it("follows the team's structures and every step plan adds up to 100%", () => {
    expect(QUESTION_GUIDE.map((g) => g.name)).toEqual(["직무 역량", "협업·갈등", "성장과정·가치관", "지원동기·입사 후 포부"]);
    for (const g of QUESTION_GUIDE) expect(g.steps.reduce((n, [, p]) => n + p, 0)).toBe(100);
  });
});
