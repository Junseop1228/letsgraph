import { Suspense } from "react";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { catalog } from "@/lib/data";
import { formatEok } from "@/lib/format";
import { Crumbs, Kicker, SourceLine, TrustLabel, btn } from "@/components/lg/ui";
import { TrendChart } from "@/components/charts/trend-chart";
import { SegmentDonut } from "@/components/charts/segment-donut";
import { UpdatesList } from "@/components/explore/updates-list";
import { cn } from "@/lib/utils";
import { eunNeun } from "@/lib/ko";



// 사업부 상세 (specs/company CORP-05)
async function SegmentPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; segmentId: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { id, segmentId } = await params;
  const { job: jobQ } = await searchParams;
  const repo = await catalog();
  const [c, seg, detail, segments, roles] = await Promise.all([
    repo.company(id),
    repo.segment(segmentId),
    repo.segmentDetail(segmentId),
    repo.segments(id),
    repo.jobRoles(),
  ]);
  if (!c || !seg || seg.companyId !== c.id) notFound();
  const jobId = jobQ && seg.jobRoleIds.includes(jobQ) ? jobQ : seg.jobRoleIds[0];
  const job = roles.find((r) => r.id === jobId);

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <Crumbs items={[{ href: "/explore/map", label: "직무 맵" }, { href: `/company/${c.id}`, label: c.name }, { label: seg.name }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-heading-1">{seg.name}</h1>
          <p className="mt-1 text-body-lg text-text-secondary">{seg.summary}</p>
        </div>
        <div className="flex gap-2">
          {job && <Link href={`/explore/map?job=${job.id}`} className={btn.secondary}>직무 맵으로</Link>}
          <Link href={`/company/${c.id}`} className={btn.primary}>기업 상세 보기 <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </div>

      {!detail ? (
        <p className="mt-8 rounded-container bg-bg-sunken p-6 text-body">이 사업부의 상세 정보는 준비 중이에요.</p>
      ) : (
        <>
          <section className="space-y-4 border-b border-border py-6">
            <Kicker right={<TrustLabel p={detail.flowSource} />}>이 사업부는 이렇게 돈을 벌어요</Kicker>
            <ol className="grid overflow-hidden rounded-container border border-border md:grid-cols-4">
              {detail.flow.map((f, i) => {
                const last = i === detail.flow.length - 1;
                return (
                  <li key={f.key} className={cn("space-y-1 p-4", last ? "bg-bg-inverted text-text-inverted" : "border-b border-border md:border-b-0 md:border-r")}>
                    <p className={cn("text-caption", last ? "text-text-inverted-secondary" : "text-text-secondary")}>{f.key}</p>
                    {f.figure != null ? <p className="figures text-figure-hero">{formatEok(f.figure)}</p> : <p className="text-heading-3">{f.title}</p>}
                    <p className={cn("text-caption", last ? "text-text-inverted-secondary" : "text-text-secondary")}>{f.detail}</p>
                  </li>
                );
              })}
            </ol>
            <p className="text-caption text-text-secondary">{detail.flowSource.label}했어요.</p>
          </section>

          <div className="grid gap-px border-b border-border bg-border md:grid-cols-2">
            <section className="space-y-4 bg-bg-page py-6 pr-6">
              <Kicker right={<span className="figures text-caption text-text-secondary">FY{c.fiscalYear} · {c.basisNote}</span>}>회사 전체 매출 중 이 사업부</Kicker>
              <SegmentDonut segments={segments} focusId={seg.id} />
              {c.source && <SourceLine p={c.source} />}
            </section>
            <section className="space-y-3 bg-bg-page py-6 md:pl-6">
              <Kicker right={<span className="text-caption text-text-secondary">억원 · 실선 매출 · 점선 영업이익</span>}>매출·이익 추이</Kicker>
              <TrendChart points={detail.trend} title={`${seg.shortName} 매출`} />
              <SourceLine p={detail.trendSource} />
            </section>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2">
            <section className="space-y-4 bg-bg-page py-6 pr-6">
              <Kicker right={<TrustLabel p={{ kind: "estimate" }} />}>{job ? `이 사업부에서 ${eunNeun(job.name)}` : "이 사업부의 직무"}</Kicker>
              <div className="flex flex-wrap gap-1.5">
                {seg.jobRoleIds.map((j) => {
                  const r = roles.find((x) => x.id === j);
                  return (
                    <Link key={j} href={`/company/${c.id}/segment/${seg.id}?job=${j}`} aria-current={j === jobId ? "true" : undefined} className={cn("h-8 rounded-element border px-3 text-label leading-8", j === jobId ? "border-bg-selected bg-bg-selected font-semibold" : "border-border-emphasized hover:bg-overlay-hover")}>
                      {r?.name ?? j}
                    </Link>
                  );
                })}
              </div>
              {job && (
                <ul className="space-y-2">
                  {(detail.jobNotes[job.id] ?? []).map((n) => (
                    <li key={n} className="flex gap-2 text-body"><span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-text-secondary" />{n}</li>
                  ))}
                </ul>
              )}
              {detail.examplePostingId && job?.id === "quality" && (
                <Link href={`/analysis/posting/${detail.examplePostingId}`} className="flex items-center justify-between rounded-element border border-border px-4 py-3 hover:bg-overlay-hover">
                  <span>
                    <span className="block text-label-strong">{c.name} · {job.name} 신입</span>
                    <span className="block text-caption text-text-secondary">2026.11.24 마감 · 데모용 예시 공고</span>
                  </span>
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
              <p className="text-caption text-text-secondary">직무 설명은 사업보고서의 사업 내용과 공고를 바탕으로 AI가 정리했어요.</p>
            </section>
            <section className="bg-bg-page py-6 md:pl-6">
              <UpdatesList updates={detail.updates} newsQuery={detail.newsQuery} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default function SegmentPage(props: { params: Promise<{ id: string; segmentId: string }>; searchParams: Promise<{ job?: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SegmentPageContent {...props} />
    </Suspense>
  );
}
