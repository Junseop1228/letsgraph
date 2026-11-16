import { connection as requestTime } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { catalog, userData } from "@/lib/data";
import { buildPromptKit, kitToMarkdown, kitToText } from "@/lib/kit/build";
import { planQuestions, stepsText } from "@/lib/kit/plan";
import { allocation, planEssay } from "@/lib/kit/questions";
import { QUESTION_TYPE_LABEL } from "@/lib/contracts/activity";
import { EssayQuestions } from "@/components/analysis/essay-questions";
import { Crumbs, DemoBadge, Kicker, TrustLabel } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { KitActions } from "@/components/analysis/kit-actions";

type Props = { params: Promise<{ id: string }> };

// Prompt Kit (specs/prompt-kit FR-PREM-03)
async function KitContent({ params }: Props) {
  await requestTime(); // request-time render: uses today's date and the user's data
  const { id } = await params;
  const { repo, demo } = await userData();
  const posting = await repo.posting(id);
  if (!posting) notFound();
  const [analysis, connection, experiences, activities] = await Promise.all([repo.postingAnalysis(id), repo.connection(id), repo.experiences(), repo.activities()]);
  if (!analysis || !connection) {
    return <p className="mx-auto mt-10 max-w-content-max rounded-container bg-bg-sunken p-6 text-body">공고 정리와 연결 결과가 있어야 Prompt Kit을 만들 수 있어요.</p>;
  }
  const cat = await catalog();
  const [segment, segmentDetail] = posting.segmentId ? await Promise.all([cat.segment(posting.segmentId), cat.segmentDetail(posting.segmentId)]) : [null, null];
  const kit = buildPromptKit({ posting, analysis, segment, segmentDetail, connection, experiences, activities });
  const text = kitToText(kit);
  // 문항 유형별 가이드: the same plan as the <문항_가이드> in the copied kit (one main episode per question type, by theme)
  const questions = posting.questions ?? [];
  const guides = questions.length
    ? planEssay(questions, experiences, activities, connection).map((p, n) => ({
        t: `${n + 1}. ${QUESTION_TYPE_LABEL[p.question.type]}`,
        body: [
          p.question.text,
          `추천 구조 · ${p.guide.structure}`,
          `글자 수 배분: ${allocation(p.guide, p.question.maxChars)}`,
          p.episode
            ? `쓸 에피소드: ${[p.episode, ...p.extra].map((e) => e.title).join(", ")}${p.question.fit ? ` (${p.question.fit})` : ""}`
            : p.activities.length
              ? `쓸 활동: ${p.activities.map((a) => a.title).join(", ")}`
              : p.question.need
                ? `필요한 장면: ${p.question.need}`
                : "",
          p.ask.length ? `직접 채울 것: ${p.ask.join(", ")}` : "",
          `강조할 점: ${p.guide.emphasis}`,
        ],
      }))
    : planQuestions(experiences, connection).map((p) => ({
    t: p.guide.name,
    body: [
      `추천 구조 · ${p.guide.structure}`,
      p.episode ? `추천 에피소드: ${p.episode.title}` : "이 유형에 맞는 에피소드가 아직 없어요. 관리 > 만들기에서 꺼내 보세요.",
      p.guide.theme === "problem" && connection.skills?.length ? `전문성 근거 활동: ${connection.skills.map((s) => `${s.activityTitle} (${s.competency})`).join(", ")}` : "",
      `글자 수 배분: ${stepsText(p.guide)}`,
      `강조할 점: ${p.guide.emphasis}`,
      `피할 것: ${p.guide.avoid}`,
    ],
  }));

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="print:hidden">
        <Crumbs items={[{ href: "/connect", label: "연결" }, { href: `/postings/${id}`, label: `${posting.companyName} · ${posting.title}` }, { href: `/connect/${id}`, label: "매칭" }, { label: "Prompt Kit" }]} />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="flex items-center gap-2 text-caption text-text-secondary">
            {posting.companyName} · {posting.title} {posting.source === "demo" && <DemoBadge>데모용 예시 공고</DemoBadge>} {demo && <DemoBadge />}
          </p>
          <h1 className="mt-1 text-heading-1">Prompt Kit 완성</h1>
        </div>
        <KitActions text={text} markdown={kitToMarkdown(kit)} filename={kit.title.replace(/\s+/g, "_")} />
      </div>

      <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="space-y-3 bg-bg-page py-6 lg:pr-6 print:hidden">
          <EssayQuestions postingId={posting.id} saved={questions} episodes={experiences.map((e) => ({ id: e.id, title: e.title }))} />
          <Kicker>{questions.length ? "문항별 가이드" : "문항 유형별 가이드"}</Kicker>
          {guides.map((g, i) => (
            <details key={g.t} open={i === 0} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-label-strong hover:bg-overlay-hover group-open:bg-bg-selected">
                {g.t}
                <span aria-hidden className="figures text-text-secondary group-open:hidden">+</span>
                <span aria-hidden className="figures hidden text-text-secondary group-open:inline">−</span>
              </summary>
              <ul className="space-y-1.5 px-3 py-3 text-body">
                {g.body.filter(Boolean).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </details>
          ))}
        </section>
        <section className="space-y-3 bg-bg-page py-6 lg:pl-6">
          <Kicker right={<TrustLabel p={{ kind: "ai", text: "AI 정리 · 공시 근거 포함" }} />}>키트 미리보기</Kicker>
          <pre tabIndex={0} aria-label={"\uD0A4\uD2B8 \uBBF8\uB9AC\uBCF4\uAE30"} className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-container border border-border bg-bg-sunken p-5 text-label [overflow-wrap:anywhere] print:max-h-none print:border-0 print:bg-transparent">{text}</pre>
          <p className="text-caption text-text-secondary print:hidden">이 키트를 쓰는 AI에 붙여넣고, 코칭을 받으며 직접 써 보세요.</p>
        </section>
      </div>
    </div>
  );
}

export default function KitPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <KitContent {...props} />
    </Suspense>
  );
}
