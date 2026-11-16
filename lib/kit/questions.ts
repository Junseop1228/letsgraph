// 지원서 문항 다듬기와 문항별 계획 (specs/prompt-kit FR-PREM-04). Pure, unit-tested.
import type { z } from "zod";
import {
  EssayQuestion,
  QUESTION_TYPE_LABEL,
  type Activity,
  type ConnectionOutput,
  type EssayQuestionsAiOutput,
  type Experience,
  type QuestionType,
} from "@/lib/contracts/activity";
import { findEpisode, QUESTION_GUIDE } from "@/lib/kit/plan";

/** What the AI read from a pasted form -> saved questions: marks removed, limits sane, at most 10. */
export function cleanQuestions(raw: z.infer<typeof EssayQuestionsAiOutput>): EssayQuestion[] {
  return raw.questions
    .map((q) => ({ ...q, text: q.text.replace(/\s+/g, " ").replace(/^(필수|선택)\s*/, "").trim() }))
    .filter((q) => q.text.length >= 5)
    .slice(0, 10)
    .map((q, i) => {
      const max = q.maxChars && q.maxChars > 0 ? Math.min(Math.round(q.maxChars), 20000) : null;
      let min = q.minChars && q.minChars > 0 ? Math.min(Math.round(q.minChars), 20000) : null;
      if (max && min && min > max) min = null;
      return EssayQuestion.parse({ id: `q${i + 1}`, text: q.text.slice(0, 1000), maxChars: max, minChars: min, type: q.type });
    });
}

export type EssayGuide = {
  type: QuestionType;
  name: string;
  structure: string;
  steps: [string, number][];
  emphasis: string;
  avoid: string;
};

const fromTheme = (type: QuestionType): EssayGuide => {
  const g = QUESTION_GUIDE.find((x) => x.theme === type)!;
  return { type, name: g.name, structure: g.structure, steps: g.steps, emphasis: g.emphasis, avoid: g.avoid };
};

export const ESSAY_GUIDE: Record<QuestionType, EssayGuide> = {
  problem: fromTheme("problem"),
  collab: fromTheme("collab"),
  growth: fromTheme("growth"),
  motive: fromTheme("motive"),
  achievement: {
    type: "achievement",
    name: QUESTION_TYPE_LABEL.achievement,
    structure: "상황과 목표 → 내가 한 행동 → 결과(숫자로) → 그 성과로 드러난 내 강점과 이 직무에서의 쓰임",
    steps: [["상황·목표", 15], ["행동", 40], ["결과", 25], ["강점·직무 연결", 20]],
    emphasis: "확인된 수치로 말하는 결과, 그리고 그 결과를 만든 내 강점",
    avoid: "팀 성과를 내 성과처럼 쓰기, 확인 안 된 숫자",
  },
  career: {
    type: "career",
    name: QUESTION_TYPE_LABEL.career,
    structure: "활동(직장)마다 항목으로: 회사명·소속, 기간, 부서·직급, 주요 업무, 업무상 강점(성과 근거), 이직 사유",
    steps: [],
    emphasis: "주요 업무는 동사로 짧게, 강점은 결과나 숫자로 뒷받침",
    avoid: "항목을 빠뜨리기, 이전 직장 탓으로 들리는 이직 사유",
  },
  other: {
    type: "other",
    name: QUESTION_TYPE_LABEL.other,
    structure: "문항이 묻는 것을 먼저 나눠 보고, 그에 맞는 구조를 제안해 확인받은 뒤 쓴다",
    steps: [],
    emphasis: "문항이 묻는 것에 빠짐없이 답하기",
    avoid: "문항과 상관없는 경험 늘어놓기",
  },
};

const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);

/** "S 상황 20% (약 1,000자)" for each step; with no limit, percentages only. */
export function allocation(g: EssayGuide, maxChars: number | null): string {
  if (!g.steps.length) return g.type === "career" ? "활동마다 비슷한 분량으로, 항목을 빠짐없이" : "문항에 맞춰 정한다";
  return g.steps.map(([s, p]) => `${s} ${p}%${maxChars ? ` (약 ${fmt(Math.round((maxChars * p) / 1000) * 10)}자)` : ""}`).join(", ");
}

export type EssayPlan = {
  question: EssayQuestion;
  guide: EssayGuide;
  episode: Experience | null;
  activities: Activity[];
  /** what the kit does not know and the coach must ask */
  ask: string[];
};

/**
 * The real questions, in order, each with its material: one main episode for story questions (by theme; 성과·강점 prefers
 * a result with numbers), the work activities for 경력기술서. An episode is the main one for one question only;
 * episodes linked to the posting's competencies come first.
 */
export function planEssay(questions: EssayQuestion[], episodes: Experience[], activities: Activity[], connection: ConnectionOutput | null): EssayPlan[] {
  const linked = new Set<string>();
  for (const l of connection?.links ?? []) {
    const e = findEpisode(episodes, l);
    if (e) linked.add(e.id);
  }
  const used = new Set<string>();
  const take = (list: Experience[]) => {
    const pick = list.find((e) => linked.has(e.id)) ?? list[0] ?? null;
    if (pick) used.add(pick.id);
    return pick;
  };
  return questions.map((q) => {
    const guide = ESSAY_GUIDE[q.type];
    const free = episodes.filter((e) => !used.has(e.id));
    if (q.type === "career") {
      const work = activities.filter((a) => a.kind === "intern" || a.kind === "parttime");
      return { question: q, guide, episode: null, activities: (work.length ? work : activities).slice(0, 4), ask: ["부서·직급", "이직 사유 (해당되면)", "회사명이 활동 이름과 다르면 정식 회사명"] };
    }
    if (q.type === "achievement") {
      const withNumbers = free.filter((e) => /\d/.test(e.result) && !e.result.includes("직접 확인해서 넣어요"));
      return { question: q, guide, episode: take(withNumbers.length ? withNumbers : free.filter((e) => !e.theme || e.theme === "problem")), activities: [], ask: [] };
    }
    if (q.type === "other") return { question: q, guide, episode: null, activities: [], ask: [] };
    const fits = free.filter((e) => e.theme === q.type || (!e.theme && q.type === "problem"));
    return { question: q, guide, episode: take(fits), activities: [], ask: [] };
  });
}
