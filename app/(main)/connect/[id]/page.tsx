import { connection as requestTime } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { userData, supabaseEnabled } from "@/lib/data";
import { Crumbs, DemoBadge, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { ActionButton } from "@/components/analysis/action-button";
import { ConnectionExplorer } from "@/components/connect/connection-explorer";
import { connectAction } from "@/app/(main)/connect/actions";
import { CareerNotice, StaleNotice } from "@/components/analysis/notices";
import { careerNotice, careerRequirement } from "@/lib/posting/career";
import { cardsKey, isStale } from "@/lib/connect/freshness";
import { evidenceOf } from "@/lib/connect/evidence";

type Props = { params: Promise<{ id: string }> };

// 지원 근거 (specs/connection FR-PREM-02): condition on the left -> recommended card -> details, why, what is missing.
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
  const evidence = connection ? evidenceOf(connection, analysis, experiences, activities) : [];
  const connected = evidence.filter((e) => e.cardType !== "none").length;
  const notice = analysis ? careerNotice(careerRequirement(analysis, posting.title)) : null;
  const stale = !!connection && isStale(connection.basis, cardsKey(experiences, activities));

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
            프롬프트 키트 <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      <CareerNotice notice={notice} />
      {stale && premium ? (
        <StaleNotice action={<ActionButton action={connectAction.bind(null, id)} label="연결 다시 만들기 (쿼터 1회)" pendingLabel="연결하는 중…" />}>
          이 연결 결과를 만든 뒤 활동이나 에피소드가 바뀌었어요. 새로 만든 카드는 아직 이어지지 않았어요.
        </StaleNotice>
      ) : null}
      {!connection ? (
        <div className="mt-8 space-y-3 rounded-container bg-bg-sunken p-6">
          <p className="text-heading-3">아직 연결 결과가 없어요</p>
          <p className="text-body text-text-secondary">공고의 핵심 역량, 자격 요건, 우대 사항마다 근거가 될 내 활동·에피소드를 AI가 추천해요. 쿼터 1회를 써요.</p>
          <ActionButton action={connectAction.bind(null, id)} label="지원 근거 찾기" pendingLabel="근거 찾는 중…" />
        </div>
      ) : !premium ? (
        <div className="mt-8 space-y-3 rounded-container bg-bg-sunken p-6">
          <p className="text-heading-3">근거가 있는 조건 <span className="figures">{connected}</span>개를 찾았어요</p>
          <p className="text-body text-text-secondary">어떤 카드가 어떤 조건의 근거인지는 패스가 있으면 볼 수 있어요.</p>
          <Link href="/billing" className={btn.primary}>패스 보기</Link>
        </div>
      ) : (
        <ConnectionExplorer evidence={evidence} activities={activities} episodes={experiences} />
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
