import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { catalog, userData } from "@/lib/data";
import { dDay, formatEok } from "@/lib/format";
import { POSTING_STATUS_LABEL } from "@/lib/contracts/activity";
import { Crumbs, DemoBadge, Kicker, TrustLabel, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";

type Props = { params: Promise<{ id: string }> };

// 공고 정리 화면 (specs/posting FR-POST-01)
async function PostingContent({ params }: Props) {
  const { id } = await params;
  const { repo: user } = await userData();
  const posting = await user.posting(id);
  if (!posting) notFound();
  const analysis = await user.postingAnalysis(id);
  const cat = await catalog();
  const [company, segment, job] = await Promise.all([
    posting.companyId ? cat.company(posting.companyId) : null,
    posting.segmentId ? cat.segment(posting.segmentId) : null,
    posting.jobRoleId ? cat.jobRole(posting.jobRoleId) : null,
  ]);
  const stated = analysis?.competencies.filter((c) => c.basis === "stated") ?? [];
  const inferred = analysis?.competencies.filter((c) => c.basis === "inferred") ?? [];

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <Crumbs items={[{ href: "/analysis", label: "분석" }, { label: `${posting.companyName} · ${posting.title}` }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="flex items-center gap-2 text-caption text-text-secondary">
            {posting.companyName}{segment ? ` · ${segment.name}` : ""}
            {posting.source === "demo" && <DemoBadge>데모용 예시 공고</DemoBadge>}
          </p>
          <h1 className="mt-1 text-heading-1">{posting.title}</h1>
          <div className="mt-3 inline-flex overflow-hidden rounded-element border border-border-emphasized text-label">
            <span className="figures border-r border-border px-3 py-1.5">{dDay(posting.deadline)}</span>
            <span className="figures border-r border-border px-3 py-1.5">{posting.deadline ? `~ ${posting.deadline.replaceAll("-", ".")}` : posting.deadlineNote ?? "마감일 미정"}</span>
            <span className="px-3 py-1.5"><span className="text-text-secondary">상태</span> {POSTING_STATUS_LABEL[posting.status]}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {job && <Link href={`/explore/map?job=${job.id}`} className={btn.secondary}>직무 맵에서 보기</Link>}
          <Link href={`/analysis/posting/${posting.id}/connection`} className={btn.primary}>
            내 경험과 연결 보기 <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {!analysis ? (
        <p className="mt-8 rounded-container bg-bg-sunken p-6 text-body">아직 정리된 내용이 없어요. 공고 PDF를 다시 올려 주세요.</p>
      ) : (
        <div className="grid gap-px bg-border lg:grid-cols-2">
          <section className="space-y-5 bg-bg-page py-6 lg:pr-6">
            <Kicker right={<TrustLabel p={{ kind: "ai", text: "AI 정리" }} />}>공고 정리</Kicker>
            {[
              ["주요 업무", analysis.duties],
              ["자격 요건", analysis.qualifications],
              ["우대 사항", analysis.preferred],
            ].map(([title, items]) =>
              (items as string[]).length ? (
                <div key={title as string}>
                  <h2 className="text-heading-3">{title as string}</h2>
                  <ul className="mt-2 space-y-1.5">
                    {(items as string[]).map((x) => (
                      <li key={x} className="flex gap-2 text-body"><span aria-hidden className="mt-2.5 h-px w-2 shrink-0 bg-text-secondary" />{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            <p className="text-caption text-text-secondary">원문 기준으로 다시 확인할 수 있어요. AI가 정리했어요.</p>
            {analysis.cautions.map((c) => (
              <p key={c} className="flex gap-3 rounded-element bg-warning-muted p-4 text-label text-text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span><span className="block text-label-strong">작성 주의사항</span>{c}</span>
              </p>
            ))}
          </section>

          <section className="space-y-6 bg-bg-page py-6 lg:pl-6">
            {company && (
              <div className="space-y-3">
                <Kicker>이 직무의 위치</Kicker>
                <div className="flex flex-wrap items-center gap-2 text-label">
                  {job && <span className="rounded-element bg-graph-job px-3 py-1.5 text-on-accent">{job.name}</span>}
                  <span aria-hidden className="h-px w-4 bg-graph-edge" />
                  <Link href={`/company/${company.id}`} className="rounded-element border border-border-emphasized px-3 py-1.5 hover:bg-overlay-hover">{company.name}</Link>
                  {segment && (
                    <>
                      <span aria-hidden className="h-px w-4 bg-graph-edge" />
                      <Link href={`/company/${company.id}/segment/${segment.id}${job ? `?job=${job.id}` : ""}`} className="rounded-element border border-border-emphasized px-3 py-1.5 hover:bg-overlay-hover">{segment.name}</Link>
                    </>
                  )}
                </div>
                {segment && (
                  <>
                    <p className="text-body">{segment.summary}</p>
                    <p className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
                      <TrustLabel p={{ kind: "filing" }} />
                      {segment.name} {company.fiscalYear} 매출 <span className="figures">{formatEok(segment.revenue)}</span> · 영업이익 <span className="figures">{formatEok(segment.operatingIncome)}</span>
                    </p>
                  </>
                )}
              </div>
            )}
            <div className="space-y-3">
              <Kicker>요구 역량</Kicker>
              {[
                { list: stated, label: "공고 명시", kind: "filing" as const },
                { list: inferred, label: "업무상 추론", kind: "ai" as const },
              ].map((g) =>
                g.list.length ? (
                  <div key={g.label} className="flex flex-wrap items-center gap-2">
                    <TrustLabel p={{ kind: g.kind, text: g.label }} />
                    {g.list.map((c) => (
                      <span key={c.name} title={c.evidence} className="h-8 rounded-element border border-border-emphasized px-3 text-label leading-8">{c.name}</span>
                    ))}
                  </div>
                ) : null,
              )}
              <p className="text-caption text-text-secondary">추론 역량은 주요 업무와 사업부 정보에서 AI가 뽑았어요. 역량에 마우스를 올리면 근거가 보여요.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function PostingPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PostingContent {...props} />
    </Suspense>
  );
}
