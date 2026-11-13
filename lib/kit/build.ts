// Prompt Kit 조립 (specs/prompt-kit FR-PREM-03). Deterministic: no LLM call, only validated pieces.
import type { ConnectionOutput, Experience, JobPosting, PostingAnalysisOutput, PromptKit } from "@/lib/contracts/activity";
import type { BusinessSegment, SegmentDetail } from "@/lib/contracts/domain";
import { formatChange, formatEok } from "@/lib/format";

type Input = {
  posting: JobPosting;
  analysis: PostingAnalysisOutput;
  segment?: BusinessSegment | null;
  segmentDetail?: SegmentDetail | null;
  connection: ConnectionOutput;
  experiences: Experience[];
  now?: Date;
};

const tag = (name: string, attrs: string, lines: string[]) => [`<${name}${attrs ? " " + attrs : ""}>`, ...lines, `</${name}>`].join("\n");

export function buildPromptKit(i: Input): PromptKit {
  const stated = i.analysis.competencies.filter((c) => c.basis === "stated").map((c) => c.name);
  const inferred = i.analysis.competencies.filter((c) => c.basis === "inferred").map((c) => c.name);
  const src = i.posting.source === "demo" ? "데모용 예시 공고" : "내가 올린 공고";

  const sections: PromptKit["sections"] = [
    {
      id: "role",
      title: "역할과 규칙",
      body: tag("역할과_규칙", "", ["너는 자기소개서 코치다. 문장을 대신 쓰지 말고, 내가 빠뜨린 근거를 한 번에 하나씩 질문해라."]),
    },
    {
      id: "posting",
      title: "공고",
      body: tag("공고", `출처="${src}"`, [
        `${i.analysis.companyName}${i.segment ? ` ${i.segment.name}` : ""} · ${i.analysis.title}`,
        `주요 업무: ${i.analysis.duties.join(", ")}`,
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

  i.connection.links.forEach((l, k) => {
    const e = i.experiences.find((x) => x.title === l.experienceTitle);
    const lines = [e?.sourceLabel ? `${e.sourceLabel} · ${l.experienceTitle}` : l.experienceTitle];
    if (e?.situation) lines.push(`상황: ${e.situation}`);
    if (e?.action) lines.push(`행동: ${e.action}`);
    if (e?.result) lines.push(`결과: ${e.result}`);
    lines.push(`연결 이유: ${l.reason}`);
    sections.push({ id: `ep-${k + 1}`, title: `에피소드 ${k + 1}`, body: tag("에피소드", `id="${k + 1}" 역량="${l.competency}"`, lines) });
  });

  if (i.connection.gaps.length) {
    sections.push({
      id: "gaps",
      title: "빈 역량",
      body: tag("빈_역량", "", i.connection.gaps.map((g) => `${g}: 연결된 경험이 없음. 경험을 지어내지 말고, 나에게 질문해서 찾게 할 것.`)),
    });
  }
  sections.push({
    id: "rules",
    title: "규칙",
    body: tag("규칙", "", ["- 내 경험에 없는 사실이나 수치를 만들지 말 것", "- 문항마다 추천 구조를 먼저 보여주고, 초안은 내가 쓸 것"]),
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
