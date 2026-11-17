import { LoginPrompt } from "@/components/lg/login-prompt";
import { connection as requestTime } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, userData } from "@/lib/data";
import { buildPromptKit, kitToMarkdown, kitToText } from "@/lib/kit/build";
import { REQUIREMENT_KIND_LABEL, RequirementKind } from "@/lib/contracts/activity";
import { evidenceOf } from "@/lib/connect/evidence";
import { CareerNotice, StaleNotice } from "@/components/analysis/notices";
import { careerNotice, careerRequirement } from "@/lib/posting/career";
import { cardsKey, isStale } from "@/lib/connect/freshness";
import { StrengthMeter } from "@/components/connect/connection-explorer";
import { Crumbs, DemoBadge, Kicker, TrustLabel, btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { KitActions } from "@/components/analysis/kit-actions";

type Props = { params: Promise<{ id: string }> };

// 프롬프트 키트 (specs/prompt-kit FR-PREM-03): the posting's conditions with the recommended cards, and the pack to copy.
async function KitContent({ params }: Props) {
  await requestTime(); // request-time render: uses today's date and the user's data
  const { id } = await params;
  const { repo, demo, guest } = await userData();
  if (guest) return <LoginPrompt next="/connect" title="로그인하면 공고와 내 경험을 이어 볼 수 있어요" text="공고 조건마다 근거가 될 내 활동과 에피소드를 찾고, 프롬프트 키트로 가져가요. 시즌 패스로 쓸 수 있어요." />;
  const posting = await repo.posting(id);
  if (!posting) notFound();
  const [analysis, connection, experiences, activities] = await Promise.all([repo.postingAnalysis(id), repo.connection(id), repo.experiences(), repo.activities()]);
  if (!analysis || !connection) {
    return <p className="mx-auto mt-10 max-w-content-max rounded-container bg-bg-sunken p-6 text-body">공고 정리와 지원 근거가 있어야 키트를 만들 수 있어요.</p>;
  }
  const cat = await catalog();
  const [segment, segmentDetail] = posting.segmentId ? await Promise.all([cat.segment(posting.segmentId), cat.segmentDetail(posting.segmentId)]) : [null, null];
  const kit = buildPromptKit({ posting, analysis, segment, segmentDetail, connection, experiences, activities });
  const text = kitToText(kit);
  const evidence = evidenceOf(connection, analysis, experiences, activities);
  const notice = careerNotice(careerRequirement(analysis, posting.title));
  const stale = isStale(connection.basis, cardsKey(experiences, activities));

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="print:hidden">
        <Crumbs items={[{ href: "/connect", label: "연결" }, { href: `/postings/${id}`, label: `${posting.companyName} · ${posting.title}` }, { href: `/connect/${id}`, label: "지원 근거" }, { label: "키트" }]} />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="flex items-center gap-2 text-caption text-text-secondary">
            {posting.companyName} · {posting.title} {posting.source === "demo" && <DemoBadge>데모용 예시 공고</DemoBadge>} {demo && <DemoBadge />}
          </p>
          <h1 className="mt-1 text-heading-1">프롬프트 키트</h1>
          <p className="mt-1 text-body text-text-secondary">공고 조건마다 근거가 될 내 활동·에피소드를 모았어요. 원하는 AI에 붙여넣고, 글은 내 방식대로 써요.</p>
        </div>
        <KitActions text={text} markdown={kitToMarkdown(kit)} filename={kit.title.replace(/\s+/g, "_")} />
      </div>

      <div className="print:hidden">
        <CareerNotice notice={notice} />
        {stale ? (
          <StaleNotice action={<Link href={`/connect/${id}`} className={cn(btn.secondary, btn.sm)}>지원 근거 다시 찾기</Link>}>
            지원 근거를 찾은 뒤 활동이나 에피소드가 바뀌었어요. 이 키트는 예전 카드 기준이에요.
          </StaleNotice>
        ) : null}
      </div>

      <div className="mt-6 grid gap-px bg-border lg:grid-cols-12">
        <section className="space-y-5 bg-bg-page py-6 lg:col-span-5 lg:pr-6 print:hidden" aria-labelledby="report-title">
          <Kicker right={<TrustLabel p={{ kind: "ai", text: "AI 추천" }} />}>
            <span id="report-title">조건별 추천</span>
          </Kicker>
          {RequirementKind.options.map((kind) => {
            const items = evidence.filter((e) => e.kind === kind);
            if (!items.length) return null;
            return (
              <div key={kind} className="space-y-2">
                <h2 className="text-label-strong text-text-secondary">{REQUIREMENT_KIND_LABEL[kind]}</h2>
                <ul className="divide-y divide-border rounded-container border border-border">
                  {items.map((e) => (
                    <li key={e.requirement} className="space-y-1 px-4 py-3">
                      <p className="text-label-strong break-keep">{e.requirement}</p>
                      <StrengthMeter strength={e.strength} />
                      <p className="text-support">{e.cardTitle ? `${e.cardType === "activity" ? "활동" : "에피소드"} "${e.cardTitle}"` : "아직 근거가 될 카드가 없어요"}</p>
                      {e.missing ? <p className="text-support text-text-secondary">부족한 점: {e.missing}</p> : null}
                      {e.next ? <p className="text-support text-text-secondary">할 일: {e.next}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <Link href={`/connect/${id}`} className={cn(btn.ghost, btn.sm)}>카드 상세와 이유 보기</Link>
        </section>
        <section className="space-y-3 bg-bg-page py-6 lg:col-span-7 lg:pl-6">
          <Kicker right={<TrustLabel p={{ kind: "ai", text: "AI 추천 · 공시 근거 포함" }} />}>키트 미리보기</Kicker>
          <pre tabIndex={0} aria-label={"\uD0A4\uD2B8 \uBBF8\uB9AC\uBCF4\uAE30"} className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-container border border-border bg-bg-sunken p-5 text-label [overflow-wrap:anywhere] print:max-h-none print:border-0 print:bg-transparent">{text}</pre>
          <p className="text-caption text-text-secondary print:hidden">이 키트를 쓰는 AI에 붙여넣고, 내 경험에 맞게 직접 써 보세요.</p>
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
