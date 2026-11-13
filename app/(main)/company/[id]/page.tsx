import { Suspense } from "react";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { catalog, userData } from "@/lib/data";
import { formatEok, formatEokShort, share } from "@/lib/format";
import { Crumbs, EmptyState, Kicker, SourceLine, TrustLabel, btn } from "@/components/lg/ui";
import { TrendChart } from "@/components/charts/trend-chart";
import { WatchButton } from "@/components/explore/watch-button";
import { UpdatesList } from "@/components/explore/updates-list";



async function CompanyPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await catalog();
  const c = await repo.company(id);
  if (!c) notFound();
  const [segments, detail, industries, roles, { repo: user }] = await Promise.all([
    repo.segments(id),
    repo.companyDetail(id),
    repo.industries(),
    repo.jobRoles(),
    userData(),
  ]);
  const watched = await user.watchedCompanyIds();
  const ind = industries.find((i) => i.id === c.industryId)?.name ?? "";
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const total = segments.reduce((t, s) => t + (s.revenue ?? 0), 0);
  const opTotal = segments.reduce((t, s) => t + Math.max(0, s.operatingIncome ?? 0), 0);
  const top = [...segments].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0];

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <Crumbs items={[{ href: "/explore/map", label: "직무 맵" }, { label: c.name }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="figures text-data-sm text-text-secondary">
            {ind}
            {c.fiscalYear ? ` · ${c.fiscalYear} 매출 ${formatEok(c.revenue)}` : ""}
            {c.basisNote ? ` (${c.basisNote})` : ""}
          </p>
          <h1 className="mt-1 text-heading-1">{c.name}</h1>
          {segments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {segments.map((s) => (
                <Link key={s.id} href={`/company/${c.id}/segment/${s.id}`} className="h-8 rounded-element border border-border-emphasized px-3 text-label leading-8 hover:bg-overlay-hover">
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <WatchButton companyId={c.id} initial={watched} />
      </div>

      {!c.hasDetail || segments.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="상세 정보 준비 중이에요"
            body="이 기업의 사업 부문 정보는 아직 정리되지 않았어요. 공시 수집과 미리 분석이 끝나면 여기에 나와요."
            action={<Link href="/explore/map" className={btn.secondary}>직무 맵으로</Link>}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-px border-b border-border bg-border md:grid-cols-2">
            <section className="space-y-4 bg-bg-page py-6 pr-6">
              <Kicker right={<span className="figures text-caption text-text-secondary">FY{c.fiscalYear} · {c.basisNote}</span>}>사업부 구조</Kicker>
              <div>
                <h2 className="text-heading-2">돈은 어디서 버나요?</h2>
                {top && <p className="mt-1 text-body text-text-secondary">매출의 {Math.round(share(top.revenue ?? 0, total))}%가 {top.name}에서 나와요.</p>}
              </div>
              {[
                { label: "매출", get: (s: (typeof segments)[number]) => s.revenue, tot: total },
                { label: "영업이익", get: (s: (typeof segments)[number]) => s.operatingIncome, tot: opTotal },
              ].map((m) => (
                <div key={m.label} className="space-y-2">
                  <p className="text-caption text-text-secondary">{m.label}</p>
                  {segments.map((s, k) => {
                    const v = m.get(s) ?? 0;
                    return (
                      <Link key={s.id} href={`/company/${c.id}/segment/${s.id}`} className="grid grid-cols-[88px_1fr_80px] items-center gap-3 rounded-inner text-label hover:bg-overlay-hover">
                        <span>{s.shortName}{s.calculated ? " (계산)" : ""}</span>
                        <span className="h-2.5 overflow-hidden rounded-full bg-data-track">
                          <span className="block h-full rounded-full" style={{ width: `${m.tot ? (Math.max(0, v) / m.tot) * 100 : 0}%`, background: k === 0 ? "var(--color-data-1)" : s.calculated ? "var(--color-data-3)" : "var(--color-data-2)" }} />
                        </span>
                        <span className="figures text-right text-data">{formatEokShort(v)}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
              {c.source && <SourceLine p={c.source} />}
              <p className="text-caption text-text-secondary">그 외 = 전사 − 식품 − 바이오로 계산한 값이에요. 사업부를 누르면 돈 버는 흐름이 나와요.</p>
            </section>

            <section className="space-y-4 bg-bg-page py-6 md:pl-6">
              <Kicker right={<TrustLabel p={{ kind: "estimate" }} />}>사업부별 직무 지도</Kicker>
              <ul>
                {segments.filter((s) => s.jobRoleIds.length).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border py-3">
                    <span className="w-full text-label-strong sm:w-28">{s.name}</span>
                    {s.jobRoleIds.map((j) => (
                      <Link key={j} href={`/company/${c.id}/segment/${s.id}?job=${j}`} className="h-8 rounded-element bg-bg-tonal px-3 text-label leading-8 hover:bg-bg-tonal-hover">
                        {roleName.get(j) ?? j}
                      </Link>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="text-caption text-text-secondary">사업보고서의 사업 내용으로 AI가 추정했어요. 직무를 누르면 그 사업부에서 하는 일이 나와요.</p>
            </section>
          </div>

          {detail && (
            <div className="grid gap-px bg-border md:grid-cols-2">
              <section className="space-y-3 bg-bg-page py-6 pr-6">
                <Kicker right={<span className="text-caption text-text-secondary">억원 · {c.basisNote}</span>}>재무 추이</Kicker>
                <TrendChart points={detail.trend} />
                <SourceLine p={detail.trendSource} />
              </section>
              <section className="bg-bg-page py-6 md:pl-6">
                <UpdatesList updates={detail.updates} newsQuery={detail.newsQuery} />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CompanyPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompanyPageContent {...props} />
    </Suspense>
  );
}
