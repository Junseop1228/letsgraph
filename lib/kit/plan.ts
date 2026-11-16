// 문항 배정 (specs/prompt-kit FR-PREM-03): which episode serves which kind of 자소서 question, by episode theme.
// Structures follow the team's 문항별 추천 구조 (STAR, 갈등-행동-결과-교훈, 경험-가치관-직무 연결, WHY-WHAT-HOW-WILL).
// Pure, unit-tested.
import type { ConnectionOutput, EpisodeTheme, Experience } from "@/lib/contracts/activity";

export type QuestionGuide = {
  theme: EpisodeTheme;
  name: string;
  structure: string;
  /** step and its share of the character limit, in % */
  steps: [string, number][];
  emphasis: string;
  avoid: string;
};

export const QUESTION_GUIDE: QuestionGuide[] = [
  {
    theme: "problem",
    name: "직무 역량",
    structure: "STAR: 상황 → 맡은 역할과 과제 → 구체적인 행동 → 결과와 배운 점",
    steps: [["S 상황", 20], ["T 역할·과제", 15], ["A 행동", 40], ["R 결과·배운 점", 25]],
    emphasis: "공고에 적힌 역량과, 내가 직접 한 행동",
    avoid: "역량 여러 개를 얕게 나열하기",
  },
  {
    theme: "collab",
    name: "협업·갈등",
    structure: "갈등의 원인 → 내가 한 소통·조율 → 팀의 결과와 관계 변화 → 배운 점과 입사 후 적용",
    steps: [["갈등 원인", 20], ["소통·조율", 45], ["결과·관계 변화", 20], ["배운 점·적용", 15]],
    emphasis: "갈등의 원인을 분명히, 내가 한 행동을 중심으로",
    avoid: "남 탓, 팀 성과만 쓰기",
  },
  {
    theme: "growth",
    name: "성장과정·가치관",
    structure: "결정적인 경험 → 깨달음과 가치관 → 그 가치관이 직무에서 드러날 모습",
    steps: [["경험", 35], ["가치관 형성", 35], ["직무 연결", 30]],
    emphasis: "그 가치관이 이 직무에서 어떻게 드러날지",
    avoid: "어린 시절부터의 일대기",
  },
  {
    theme: "motive",
    name: "지원동기·입사 후 포부",
    structure: "WHY(회사·사업부 방향과 맞닿은 점) → WHAT(준비한 역량) → HOW(기여할 지점) → WILL(1년·3년 뒤 모습)",
    steps: [["WHY", 25], ["WHAT", 25], ["HOW", 30], ["WILL", 20]],
    emphasis: "사업부가 돈 버는 구조와 방향을 구체적으로",
    avoid: "회사 칭찬 나열, 누구나 쓸 수 있는 동기",
  },
];

/** The episode a connection link points to: by id, or by title for links made before ids existed. */
export function findEpisode(episodes: Experience[], l: { experienceId?: string; experienceTitle: string }): Experience | null {
  return (l.experienceId ? episodes.find((e) => e.id === l.experienceId) : undefined) ?? episodes.find((e) => e.title === l.experienceTitle) ?? null;
}

export type QuestionPlan = { guide: QuestionGuide; episode: Experience | null };

/**
 * One main episode per question type, matched by theme. Episodes linked to the posting's competencies come first,
 * and an episode is the main one for one question only. Episodes made before themes existed can still serve 직무 역량.
 */
export function planQuestions(episodes: Experience[], connection: ConnectionOutput | null): QuestionPlan[] {
  const linked = new Set<string>();
  for (const l of connection?.links ?? []) {
    const e = findEpisode(episodes, l);
    if (e) linked.add(e.id);
  }
  const used = new Set<string>();
  return QUESTION_GUIDE.map((guide) => {
    const fits = (e: Experience) => !used.has(e.id) && (e.theme === guide.theme || (!e.theme && guide.theme === "problem"));
    const candidates = episodes.filter(fits);
    const pick = candidates.find((e) => linked.has(e.id) && e.theme === guide.theme) ?? candidates.find((e) => linked.has(e.id)) ?? candidates.find((e) => e.theme === guide.theme) ?? candidates[0] ?? null;
    if (pick) used.add(pick.id);
    return { guide, episode: pick };
  });
}

export const stepsText = (g: QuestionGuide) => g.steps.map(([s, p]) => `${s} ${p}%`).join(", ");
