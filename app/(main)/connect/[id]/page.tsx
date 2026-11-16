import { connection as requestTime } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { userData, supabaseEnabled } from "@/lib/data";
import { EPISODE_THEME_LABEL, EXPERIENCE_KIND_LABEL } from "@/lib/contracts/activity";
import { findEpisode } from "@/lib/kit/plan";
import { competencyKind } from "@/lib/connect/normalize";
import { Crumbs, DemoBadge, Kicker, TrustLabel, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { ActionButton } from "@/components/analysis/action-button";
import { connectAction } from "@/app/(main)/connect/actions";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

// 연결 결과 (specs/connection FR-PREM-02)
async function ConnectionContent({ params }: Props) {
  await requestTime(); // request-time render: uses today's date and the user's data
  const { id } = await params;
  const { repo, demo } = await userData();
  const posting = await repo.posting(id);
  if (!posting) notFound();
  const [analysis, experiences, connection, activities] = await Promise.all([repo.postingAnalysis(id), repo.experiences(), repo.connection(id), repo.activities()]);

  let premium = demo; // demo shows the premium screen, labelled
  if (!demo && supabaseEnabled()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { currentPlan } = await import("@/lib/billing/server");
    premium = (await currentPlan(await createClient())).plan === "premium";
  }
  const linkedIds = new Set((connection?.links ?? []).flatMap((l) => findEpisode(experiences, l)?.id ?? []));
  const skillActivityIds = new Set((connection?.skills ?? []).flatMap((s) => s.activityId ?? []));
  const KIND_LABEL = { skill: "전문성, 활동", behavior: "행동, 에피소드", gap: "연결 없음" } as const;
  const activityTitle = (activityId?: string) => activities.find((a) => a.id === activityId)?.title;
  const comps = analysis?.competencies ?? [];

  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <Crumbs items={[{ href: "/connect", label: "연결" }, { href: `/postings/${id}`, label: `${posting.companyName} · ${posting.title}` }, { label: "매칭" }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="flex items-center gap-2 text-caption text-text-secondary">공고 {posting.source === "demo" && <DemoBadge>데모용 예시 공고</DemoBadge>}</p>
          <h1 className="mt-1 text-heading-1">{posting.companyName} {posting.title}</h1>
          {demo && <p className="mt-1 text-caption text-text-secondary">데모에서는 패스가 있을 때의 화면을 보여줘요.</p>}
        </div>
        {connection && premium && (
          <Link href={`/connect/${id}/kit`} className={btn.primary}>
            Prompt Kit 만들기 <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {!connection ? (
        <div className="mt-8 space-y-3 rounded-container bg-bg-sunken p-6">
          <p className="text-heading-3">아직 연결 결과가 없어요</p>
          <p className="text-body text-text-secondary">공고의 요구 역량과 내 경험 카드를 AI가 이어 줘요. 쿼터 1회를 써요.</p>
          <ActionButton action={connectAction.bind(null, id)} label="연결 결과 만들기" pendingLabel="연결하는 중…" />
        </div>
      ) : !premium ? (
        <div className="mt-8 space-y-3 rounded-container bg-bg-sunken p-6">
          <p className="text-heading-3">연결 지점 <span className="figures">{connection.links.length}</span>곳을 찾았어요</p>
          <p className="text-body text-text-secondary">어떤 경험이 어떤 역량과 이어지는지는 패스가 있으면 볼 수 있어요.</p>
          <Link href="/billing" className={btn.primary}>패스 보기</Link>
        </div>
      ) : (
        <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,4fr)]">
          <section className="space-y-3 bg-bg-page py-6 lg:pr-6">
            <Kicker right={<span className="text-caption text-text-secondary">빈 사각형 = 공고</span>}>공고 요구 역량</Kicker>
            <ul className="space-y-2">
              {comps.map((c) => {
                const kind = competencyKind(connection, c.name);
                const gap = kind === "gap";
                return (
                  <li key={c.name} className={cn("flex items-center justify-between rounded-element border px-3 py-2.5", gap ? "border-dashed border-border-emphasized text-text-secondary" : "border-border-emphasized")}>
                    <span className="flex items-center gap-2 text-label-strong">
                      <i aria-hidden className={cn("size-2.5 rounded-[1px]", gap ? "border border-dashed border-graph-node" : "bg-graph-node")} />
                      {c.name}
                    </span>
                    <span className="text-caption text-text-secondary">{kind ? KIND_LABEL[kind] : c.basis === "stated" ? "명시" : "추론"}</span>
                  </li>
                );
              })}
            </ul>
            {connection.gaps.map((g) => (
              <div key={g} className="rounded-element bg-warning-muted p-4 text-label text-text-warning">
                <p className="text-label-strong">빈 역량: {g}</p>
                <p>아직 이 역량을 보여줄 활동이나 에피소드가 없어요.</p>
                <Link href="/manage?tab=chat" className={cn(btn.secondary, btn.sm, "mt-2")}><Plus className="size-4" aria-hidden /> 에피소드 꺼내러 가기</Link>
              </div>
            ))}
          </section>

          <section className="space-y-3 bg-bg-page py-6 lg:px-6">
            <Kicker right={<TrustLabel p={{ kind: "ai", text: "AI 근거" }} />}>연결 근거</Kicker>
            {(connection.skills ?? []).length ? (
              <div className="space-y-2">
                <h2 className="text-label-strong text-text-secondary">직무 전문성 ↔ 활동</h2>
                <ol className="space-y-3">
                  {(connection.skills ?? []).map((s) => (
                    <li key={s.competency + s.activityTitle} className="rounded-container border border-border p-4">
                      <p className="text-label-strong">{s.competency} ↔ {s.activityTitle}</p>
                      <p className="text-caption text-text-secondary">활동 전체가 근거예요</p>
                      <p className="mt-2 text-body">{s.reason}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="space-y-2">
              {(connection.skills ?? []).length ? <h2 className="text-label-strong text-text-secondary">행동 역량 ↔ 에피소드</h2> : null}
              <ol className="space-y-3">
                {connection.links.map((l) => (
                  <li key={l.competency + l.experienceTitle} className="rounded-container border border-border p-4">
                    <p className="text-label-strong">{l.competency} ↔ {l.experienceTitle}</p>
                    {activityTitle(findEpisode(experiences, l)?.activityId) ? (
                      <p className="text-caption text-text-secondary">활동: {activityTitle(findEpisode(experiences, l)?.activityId)}</p>
                    ) : null}
                    <p className="mt-2 text-body">{l.reason}</p>
                    {l.context && (
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-caption text-text-secondary">
                        <TrustLabel p={{ kind: "filing", text: "맥락" }} />
                        {l.context}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="space-y-3 bg-bg-page py-6 lg:pl-6">
            <Kicker right={<span className="text-caption text-text-secondary">채운 사각형 = 나</span>}>내 활동과 에피소드</Kicker>
            {activities.length ? (
              <ul className="space-y-2" aria-label="내 활동">
                {activities.map((a) => (
                  <li key={a.id} className={cn("rounded-element px-3 py-2.5", skillActivityIds.has(a.id) ? "bg-bg-inverted text-text-inverted" : "bg-bg-tonal text-text-secondary")}>
                    <p className="text-label-strong">{a.title}</p>
                    <p className={cn("text-caption", skillActivityIds.has(a.id) ? "text-text-inverted-secondary" : "text-text-secondary")}>
                      활동{skillActivityIds.has(a.id) ? ", 전문성 근거" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="space-y-2" aria-label="내 에피소드">
              {experiences.map((e) => (
                <li key={e.id} className={cn("rounded-element border px-3 py-2.5", linkedIds.has(e.id) ? "border-border-emphasized" : "border-border text-text-secondary")}>
                  <p className="flex items-center gap-2 text-label-strong">
                    <i aria-hidden className={cn("size-2.5 rounded-[1px]", linkedIds.has(e.id) ? "bg-graph-saved" : "bg-graph-node-dim")} />
                    {e.title}
                  </p>
                  <p className="text-caption text-text-secondary">{[e.theme ? EPISODE_THEME_LABEL[e.theme] : EXPERIENCE_KIND_LABEL[e.kind], activityTitle(e.activityId) ?? e.sourceLabel].filter(Boolean).join(", ")}</p>
                </li>
              ))}
            </ul>
            <Link href="/manage?tab=chat" className={cn(btn.secondary, btn.sm)}><Plus className="size-4" aria-hidden /> 에피소드 꺼내러 가기</Link>
          </section>
        </div>
      )}
    </div>
  );
}

export default function ConnectionPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConnectionContent {...props} />
    </Suspense>
  );
}
