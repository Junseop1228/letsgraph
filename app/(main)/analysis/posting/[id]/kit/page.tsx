import { connection as requestTime } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { catalog, userData } from "@/lib/data";
import { buildPromptKit, kitToMarkdown, kitToText } from "@/lib/kit/build";
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
  const [analysis, connection, experiences] = await Promise.all([repo.postingAnalysis(id), repo.connection(id), repo.experiences()]);
  if (!analysis || !connection) {
    return <p className="mx-auto mt-10 max-w-content-max rounded-container bg-bg-sunken p-6 text-body">공고 정리와 연결 결과가 있어야 Prompt Kit을 만들 수 있어요.</p>;
  }
  const cat = await catalog();
  const [segment, segmentDetail] = posting.segmentId ? await Promise.all([cat.segment(posting.segmentId), cat.segmentDetail(posting.segmentId)]) : [null, null];
  const kit = buildPromptKit({ posting, analysis, segment, segmentDetail, connection, experiences });
  const text = kitToText(kit);
  const first = connection.links[0];
  const collab = experiences.find((e) => e.competencies.includes("협업"));

  const guides = [
    {
      t: "지원동기",
      body: [
        "추천 구조 · WHY-WHAT-HOW",
        segment ? `${segment.name}이 왜 지금 이 직무가 중요한지 → 내가 그걸 어떻게 해낼지 → 그 근거가 된 내 경험` : "이 회사가 왜 지금 이 직무가 필요한지 → 내가 할 수 있는 일 → 근거 경험",
        first ? `추천 에피소드: ${first.experienceTitle}` : "",
        "단계별 글자 수 · 700자 기준: WHY 200 · WHAT 300 · HOW 200",
      ],
    },
    { t: "직무 역량", body: ["추천 구조 · STAR(상황-과제-행동-결과)", ...connection.links.map((l) => `${l.competency}: ${l.experienceTitle}`)] },
    { t: "협업·갈등", body: ["추천 구조 · 갈등 상황 → 내 역할 → 조율 방법 → 바뀐 점", collab ? `추천 에피소드: ${collab.title}` : "협업 경험 카드가 아직 없어요. 경험을 먼저 추가해 보세요."] },
  ];

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="print:hidden">
        <Crumbs items={[{ href: "/analysis", label: "분석" }, { href: `/analysis/posting/${id}`, label: `${posting.companyName} · ${posting.title}` }, { href: `/analysis/posting/${id}/connection`, label: "연결" }, { label: "Prompt Kit" }]} />
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
          <Kicker>문항 유형별 가이드</Kicker>
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
