import { describe, expect, it } from "vitest";
import { findEpisode, planQuestions, QUESTION_GUIDE } from "@/lib/kit/plan";
import { buildPromptKit, kitToText } from "@/lib/kit/build";
import { Experience, type ConnectionOutput } from "@/lib/contracts/activity";
import { DEMO_ACTIVITIES, DEMO_ANALYSES, DEMO_CONNECTIONS, DEMO_EXPERIENCES, DEMO_POSTINGS, SEGMENTS, SEGMENT_DETAILS } from "@/lib/data/fixtures";

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

describe("FR-PREM-03 키트 본문", () => {
  it("has a 전문성 근거 block for the activity that proves a job skill, named in the 직무 역량 guide", () => {
    const t = kitToText(buildPromptKit({
      posting: DEMO_POSTINGS[0],
      analysis: DEMO_ANALYSES[DEMO_POSTINGS[0].id],
      connection: DEMO_CONNECTIONS[DEMO_POSTINGS[0].id],
      experiences: DEMO_EXPERIENCES,
      activities: DEMO_ACTIVITIES,
    }));
    expect(t).toContain('<전문성_근거 활동="교내 데이터 분석 공모전">');
    expect(t).toContain("사용한 데이터: 서울시 상권 공공 데이터, 공개 데이터");
    expect(t).toContain("증명하는 역량 (데이터 분석):");
    expect(t).toContain('- 전문성 근거 활동: "교내 데이터 분석 공모전" (데이터 분석)');
  });

  const posting = DEMO_POSTINGS[0];
  const kit = buildPromptKit({
    posting,
    analysis: DEMO_ANALYSES[posting.id],
    segment: SEGMENTS.find((s) => s.id === posting.segmentId),
    segmentDetail: SEGMENT_DETAILS.find((d) => d.segmentId === posting.segmentId),
    connection: DEMO_CONNECTIONS[posting.id],
    experiences: DEMO_EXPERIENCES,
    activities: DEMO_ACTIVITIES,
    now: new Date("2026-11-16T00:00:00Z"),
  });
  const text = kitToText(kit);
  it("carries the question guide, qualifications and the coaching steps in the copied text", () => {
    expect(text).toContain("<문항_가이드>");
    expect(text).toContain("[직무 역량] STAR");
    expect(text).toContain("[협업·갈등]");
    expect(text).toContain("이 유형에 맞는 에피소드가 아직 없어요");
    expect(text).toContain("<진행_방식>");
    if (DEMO_ANALYSES[posting.id].qualifications.length) expect(text).toContain("자격 요건:");
  });
  it("episode blocks have the episode's own content and name its activity, without the activity's details", () => {
    expect(text).toMatch(/<에피소드 id="\d" 테마="[^"]+" 활동="[^"]+">/);
    expect(text).toContain('활동="카페 아르바이트"');
    const episodeBlocks = [...text.matchAll(/^<에피소드 [^>]*>[\s\S]*?^<\/에피소드>/gm)].map((m) => m[0]).join("\n");
    expect(episodeBlocks).not.toContain("사용한 데이터");
    expect(text).not.toContain("동네 카페에서 주 4회 마감과 발주를 맡았어요."); // an activity that proves no skill stays out
    const stock = DEMO_EXPERIENCES.find((e) => e.id === "exp-stock")!;
    expect(text).toContain(`맡은 일: ${stock.role}`);
    expect(text).toContain(`배운 점: ${stock.learning}`);
  });
  it("lists each episode once", () => {
    const titles = [...text.matchAll(/제목: (.+)/g)].map((m) => m[1]);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
