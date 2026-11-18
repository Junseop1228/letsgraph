import { describe, expect, it } from "vitest";
import { buildPromptKit, kitToMarkdown, kitToText } from "@/lib/kit/build";
import { DEMO_ACTIVITIES, DEMO_ANALYSES, DEMO_CONNECTIONS, DEMO_EXPERIENCES, DEMO_POSTINGS, SEGMENTS, SEGMENT_DETAILS } from "@/lib/data/fixtures";
import { ConnectionOutput, PostingAnalysisOutput } from "@/lib/contracts/activity";

describe("FR-PREM-03 프롬프트 키트", () => {
  const posting = DEMO_POSTINGS[0];
  const kit = buildPromptKit({
    posting,
    analysis: DEMO_ANALYSES[posting.id],
    segment: SEGMENTS.find((s) => s.id === posting.segmentId),
    segmentDetail: SEGMENT_DETAILS.find((d) => d.segmentId === posting.segmentId),
    connection: DEMO_CONNECTIONS[posting.id],
    experiences: DEMO_EXPERIENCES,
    activities: DEMO_ACTIVITIES,
    now: new Date("2026-11-17T00:00:00Z"),
  });
  const text = kitToText(kit);

  it("has the posting, the division context and evidence for every kind of condition", () => {
    expect(text).toContain('<공고 출처="데모용 예시 공고">');
    expect(text).toContain("매출 11조 5,221억 원");
    expect(text).toContain("[핵심 역량] 주도성 (근거 강함)");
    expect(text).toContain("[자격 요건] 4년제 학사 이상 (졸업 예정자 포함) (근거 없음)");
    expect(text).toContain("[우대 사항] 교대 근무가 있는 사업장 근무 가능자 (근거 약함)");
    expect(text).toContain('- 추천: 에피소드 E1 "재고 폐기 줄이기"');
    expect(text).toContain("- 부족한 점: 품질·검사 데이터를 직접 다룬 경험은 아니에요.");
    expect(kitToMarkdown(kit).startsWith("# CJ제일제당 품질관리 신입 프롬프트 키트")).toBe(true);
  });
  it("carries each recommended card once, and nothing about how to write", () => {
    expect([...text.matchAll(/^<에피소드 /gm)]).toHaveLength(2); // 재고 폐기 줄이기, 백엔드 장애 대응
    expect([...text.matchAll(/^<활동 /gm)]).toHaveLength(2); // 공모전, 카페 아르바이트
    expect(text).toContain("사용한 데이터: 서울시 상권 공공 데이터, 공개 데이터");
    for (const word of ["<문항_가이드>", "<진행_방식>", "STAR", "배분", "구조로 진행"]) expect(text).not.toContain(word);
    expect(text).not.toContain("<문항>"); // no questions saved: no questions block and no questions rule
  });
  it("demo AI outputs satisfy their contracts", () => {
    for (const a of Object.values(DEMO_ANALYSES)) expect(PostingAnalysisOutput.safeParse(a).success).toBe(true);
    for (const c of Object.values(DEMO_CONNECTIONS)) expect(ConnectionOutput.safeParse(c).success).toBe(true);
  });
});

describe("FR-PREM-03 문항과 글자 수 (BM 2026-11-18)", () => {
  const posting = {
    ...DEMO_POSTINGS[0],
    questions: [
      { id: "q1", text: "지원 동기를 적어 주세요.", maxChars: 700, minChars: null, type: "motive" as const, episodeIds: [DEMO_EXPERIENCES[0].id], fit: "현장 문제를 데이터로 푼 경험이 품질관리와 이어져요." },
      { id: "q2", text: "실패를 극복한 경험을 적어 주세요.", maxChars: 500, minChars: 300, type: "problem" as const, episodeIds: [], need: "계획이 틀어졌을 때 다시 세운 장면" },
    ],
  };
  const text = kitToText(
    buildPromptKit({ posting, analysis: DEMO_ANALYSES[posting.id], connection: DEMO_CONNECTIONS[posting.id], experiences: DEMO_EXPERIENCES, activities: DEMO_ACTIVITIES, now: new Date("2026-11-18T00:00:00Z") }),
  );
  it("lists each question with its character limits and the matched episode, before the evidence", () => {
    expect(text).toContain("[문항 1] 지원 동기를 적어 주세요. (700자 이내)");
    expect(text).toContain("[문항 2] 실패를 극복한 경험을 적어 주세요. (300자 이상, 500자 이내)");
    expect(text).toMatch(/- 어울리는 에피소드: 에피소드 E\d+ "/);
    expect(text).toContain("- 어울리는 에피소드: 없음 (필요한 장면: 계획이 틀어졌을 때 다시 세운 장면)");
    expect(text.indexOf("<문항>")).toBeLessThan(text.indexOf("<지원_근거>"));
  });
  it("carries a matched episode as a card even when no condition recommended it", () => {
    expect(text).toContain(`제목="${DEMO_EXPERIENCES[0].title}"`);
  });
});