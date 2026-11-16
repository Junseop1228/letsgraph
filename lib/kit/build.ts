// Prompt Kit 조립 (specs/prompt-kit FR-PREM-03). Deterministic: no LLM call, only validated pieces.
// The kit is what the user pastes into their own AI: rules, the posting, the division context, a question guide
// (one main episode per question type, by theme), the episodes, the gaps, and how to coach.
import { EPISODE_THEME_LABEL, QUESTION_TYPE_LABEL, type Activity, type ConnectionOutput, type Experience, type JobPosting, type PostingAnalysisOutput, type PromptKit } from "@/lib/contracts/activity";
import type { BusinessSegment, SegmentDetail } from "@/lib/contracts/domain";
import { formatChange, formatEok } from "@/lib/format";
import { findEpisode, planQuestions, stepsText } from "@/lib/kit/plan";
import { allocation, planEssay } from "@/lib/kit/questions";

type Input = {
  posting: JobPosting;
  analysis: PostingAnalysisOutput;
  segment?: BusinessSegment | null;
  segmentDetail?: SegmentDetail | null;
  connection: ConnectionOutput;
  experiences: Experience[];
  activities?: Activity[];
  now?: Date;
};

const tag = (name: string, attrs: string, lines: string[]) => [`<${name}${attrs ? " " + attrs : ""}>`, ...lines.filter(Boolean), `</${name}>`].join("\n");
const list = (label: string, items: string[]) => (items.length ? `${label}: ${items.join(", ")}` : "");

export function buildPromptKit(i: Input): PromptKit {
  const stated = i.analysis.competencies.filter((c) => c.basis === "stated").map((c) => c.name);
  const inferred = i.analysis.competencies.filter((c) => c.basis === "inferred").map((c) => c.name);
  const src = i.posting.source === "demo" ? "데모용 예시 공고" : "내가 올린 공고";
  const activityOf = (e: Experience) => (e.activityId ? i.activities?.find((a) => a.id === e.activityId) : undefined);

  // episodes in the kit: the main episode of each question type, then the ones linked to competencies
  // the real questions when the user saved them (FR-PREM-04), otherwise the four general question types
  const essay = i.posting.questions?.length ? planEssay(i.posting.questions, i.experiences, i.activities ?? [], i.connection) : null;
  const plan = essay ? [] : planQuestions(i.experiences, i.connection);
  const episodes: Experience[] = [];
  const add = (e: Experience | null) => {
    if (e && !episodes.some((x) => x.id === e.id)) episodes.push(e);
  };
  for (const l of i.connection.links) add(findEpisode(i.experiences, l));
  for (const p of plan) add(p.episode);
  for (const p of essay ?? []) add(p.episode);
  const number = (e: Experience) => episodes.findIndex((x) => x.id === e.id) + 1;

  const sections: PromptKit["sections"] = [
    {
      id: "role",
      title: "역할과 규칙",
      body: tag("역할과_규칙", "", [
        "너는 자기소개서 코치다. 문장을 대신 쓰지 말고, 내가 빠뜨린 근거를 한 번에 하나씩 질문해라.",
        "- 아래 <에피소드>에 없는 경험, 사실, 수치를 만들지 마라. 부족하면 나에게 물어라.",
        "- 구조를 먼저 보여주고, 초안은 내가 쓴다.",
      ]),
    },
    {
      id: "posting",
      title: "공고",
      body: tag("공고", `출처="${src}"`, [
        `${i.analysis.companyName}${i.segment ? ` ${i.segment.name}` : ""} · ${i.analysis.title}`,
        `주요 업무: ${i.analysis.duties.join(", ")}`,
        list("자격 요건", i.analysis.qualifications),
        list("우대 사항", i.analysis.preferred),
        `요구 역량: ${stated.length ? `${stated.join(", ")} (명시)` : ""}${stated.length && inferred.length ? " / " : ""}${inferred.length ? `${inferred.join(", ")} (추론)` : ""}`,
        ...i.analysis.cautions.map((c) => `주의: ${c}`),
      ]),
    },
  ];

  if (i.segment) {
    const last = i.segmentDetail?.trend.at(-1);
    const lines = [`${i.segment.name}: ${i.segment.summary}`];
    if (i.segment.revenue != null) lines.push(`매출 ${formatEok(i.segment.revenue)} 원`);
    if (i.segment.operatingIncome != null)
      lines.push(`영업이익 ${formatEok(i.segment.operatingIncome)} 원${last?.operatingIncomeChangeReported != null ? ` (전년 대비 ${formatChange(last.operatingIncomeChangeReported)})` : ""}`);
    const figureStep = i.segmentDetail?.flow.find((f) => f.figure != null);
    if (figureStep) lines.push(figureStep.detail);
    sections.push({ id: "context", title: "사업부 맥락", body: tag("사업부_맥락", `출처="${i.segmentDetail?.trendSource.label ?? "공시"}"`, lines) });
  }

  // 직무 전문성 근거: the activities that prove job skills (whole activity, used as "I can do this" evidence only)
  const skills = i.connection.skills ?? [];
  const skillActivities = [...new Map(skills.flatMap((s) => {
    const a = i.activities?.find((x) => x.id === s.activityId) ?? i.activities?.find((x) => x.title === s.activityTitle);
    return a ? [[a.id, a] as const] : [];
  })).values()];

  const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
  const essayLines = (essay ?? []).flatMap((p, n) => {
    const q = p.question;
    const limits = [q.maxChars ? `최대 ${fmt(q.maxChars)}자` : "", q.minChars ? `최소 ${fmt(q.minChars)}자` : ""].filter(Boolean).join(", ");
    const story = !["career", "other"].includes(q.type);
    return [
      `[문항 ${n + 1}] ${QUESTION_TYPE_LABEL[q.type]}${limits ? ` (${limits})` : ""}: "${q.text}"`,
      `- 구조: ${p.guide.structure}`,
      `- 글자 수 배분: ${allocation(p.guide, q.maxChars)}`,
      q.minChars ? `- 최소 ${fmt(q.minChars)}자를 넘기도록 칸마다 분량을 안내한다` : "",
      p.episode
        ? `- 쓸 에피소드: ${number(p.episode)}번 "${p.episode.title}"`
        : p.activities.length
          ? `- 쓸 활동: ${p.activities.map((a) => `"${a.title}"`).join(", ")} (<경력_재료> 참고)`
          : story
            ? "- 이 문항에 맞는 에피소드가 아직 없어요. 지어내지 말고 나에게 질문해서 찾아라."
            : "- 쓸 재료: 문항을 보고 <에피소드>와 <전문성_근거>에서 골라 제안하고 확인받아라.",
      (q.type === "problem" || q.type === "achievement") && skills.length ? `- 전문성 근거 활동: ${skills.map((s) => `"${s.activityTitle}" (${s.competency})`).join(", ")}` : "",
      p.ask.length ? `- 아직 모르는 것 (나에게 물어서 채워라): ${p.ask.join(", ")}` : "",
      `- 강조할 점: ${p.guide.emphasis}`,
      `- 피할 것: ${p.guide.avoid}`,
      "",
    ];
  });

  sections.push({
    id: "questions",
    title: "문항 가이드",
    body: tag(
      "문항_가이드",
      "",
      essay ? essayLines : plan.flatMap((p) => [
        `[${p.guide.name}] ${p.guide.structure}`,
        p.episode ? `- 추천 에피소드: ${number(p.episode)}번 "${p.episode.title}"` : "- 이 유형에 맞는 에피소드가 아직 없어요. 지어내지 말고 나에게 질문해서 찾아라.",
        p.guide.theme === "problem" && skills.length ? `- 전문성 근거 활동: ${skills.map((s) => `"${s.activityTitle}" (${s.competency})`).join(", ")}` : "",
        `- 글자 수 배분: ${stepsText(p.guide)} (문항 글자 수에 이 비율을 곱한다)`,
        `- 강조할 점: ${p.guide.emphasis}`,
        `- 피할 것: ${p.guide.avoid}`,
        "",
      ]),
    ),
  });

  skillActivities.forEach((a, n) => {
    sections.push({
      id: `skill-${n + 1}`,
      title: `전문성 근거 ${n + 1}`,
      body: tag("전문성_근거", `활동="${a.title}"`, [
        a.period ? `기간: ${a.period}` : "",
        a.role ? `맡은 역할: ${a.role}` : "",
        a.dataset ? `사용한 데이터: ${a.dataset}` : "",
        `요약: ${a.summary}`,
        ...skills.filter((s) => s.activityTitle === a.title).map((s) => `증명하는 역량 (${s.competency}): ${s.reason}`),
        "이 활동은 '이 역량이 있다'는 근거로만 쓴다. 장면과 행동은 <에피소드>에서 가져온다.",
      ]),
    });
  });

  // 경력기술서 재료: the work activities a 경력기술서 question is written from
  const careerActivities = [...new Map((essay ?? []).flatMap((p) => p.activities.map((a) => [a.id, a] as const))).values()];
  careerActivities.forEach((a, n) => {
    const its = i.experiences.filter((e) => e.activityId === a.id).map((e) => `"${e.title}"`);
    sections.push({
      id: `career-${n + 1}`,
      title: `경력 재료 ${n + 1}`,
      body: tag("경력_재료", `활동="${a.title}"`, [
        a.period ? `기간: ${a.period}` : "",
        a.role ? `맡은 역할: ${a.role}` : "",
        `요약: ${a.summary}`,
        its.length ? `업무상 강점의 근거가 될 에피소드: ${its.join(", ")}` : "",
        "부서·직급, 이직 사유처럼 여기에 없는 항목은 지어내지 말고 나에게 물어라.",
      ]),
    });
  });

  episodes.forEach((e, k) => {
    const a = activityOf(e);
    const links = i.connection.links.filter((l) => findEpisode(i.experiences, l)?.id === e.id);
    // the episode's own content only; its activity is named so the coach knows where the scene comes from
    const attrs = [`id="${k + 1}"`, e.theme ? `테마="${EPISODE_THEME_LABEL[e.theme]}"` : "", a ? `활동="${a.title}"` : ""].filter(Boolean).join(" ");
    sections.push({
      id: `ep-${k + 1}`,
      title: `에피소드 ${k + 1}`,
      body: tag("에피소드", attrs, [
        `제목: ${e.title}`,
        e.situation ? `상황: ${e.situation}` : "",
        e.role ? `맡은 일: ${e.role}` : "",
        e.action ? `행동: ${e.action}` : "",
        e.result ? `결과: ${e.result}` : "",
        e.learning ? `배운 점: ${e.learning}` : "",
        ...links.map((l) => `연결 이유 (${l.competency}): ${l.reason}`),
      ]),
    });
  });

  if (i.connection.gaps.length) {
    sections.push({
      id: "gaps",
      title: "빈 역량",
      body: tag("빈_역량", "", i.connection.gaps.map((g) => `${g}: 연결된 경험이 없음. 경험을 지어내지 말고, 나에게 질문해서 찾게 할 것.`)),
    });
  }

  sections.push({
    id: "steps",
    title: "진행 방식",
    body: tag("진행_방식", "", [
      "1. 먼저 <문항_가이드>의 에피소드 배정이 적절한지 검토하고, 바꿀 점이 있으면 이유와 함께 제안하라.",
      essay
        ? "2. <문항_가이드>의 실제 문항을 순서대로 진행하라. 글자 수 배분을 지키고, 최소 글자 수가 있으면 넘기도록 칸마다 분량을 안내하라."
        : "2. 내가 실제 자소서 문항과 글자 수를 알려 주면, 그 문항에 맞는 유형의 구조로 진행하라.",
      "3. 문항을 하나씩 진행하라. 구조의 칸마다 질문을 하나씩 던지고, 초안은 내가 쓴다.",
      "4. 내가 초안을 쓰면 공고 요구 역량, 사업부 맥락, 에피소드에 없는 내용이 들어갔는지, 글자 수를 기준으로 잘된 점 1개와 고칠 점 최대 3개를 알려 줘라. 고친 문장을 대신 쓰지 마라.",
      "5. 모든 문항이 끝나면 문항 사이에 에피소드나 표현이 겹치는지 점검하라.",
    ]),
  });

  const now = i.now ?? new Date();
  return {
    id: `kit-${i.posting.id}`,
    postingId: i.posting.id,
    title: `${i.analysis.companyName} ${i.analysis.title} Prompt Kit`,
    createdAt: now.toISOString(),
    sections,
  };
}

export const kitToText = (k: PromptKit) => k.sections.map((s) => s.body).join("\n\n");
export const kitToMarkdown = (k: PromptKit) => [`# ${k.title}`, "", ...k.sections.flatMap((s) => [`## ${s.title}`, "", "```", s.body, "```", ""])].join("\n");
