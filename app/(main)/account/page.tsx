import Link from "next/link";
import { Suspense } from "react";
import { catalog, supabaseEnabled, userData } from "@/lib/data";
import { FREE_MONTHLY_QUOTA } from "@/lib/contracts/billing";
import { DemoBadge, Kicker, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { WatchedList } from "@/components/manage/watched-list";
import { DeleteAccount } from "@/components/manage/delete-account";
import { LogoutButton } from "@/components/logout-button";

export const metadata = { title: "내 계정 · letsGraph" };

// 내 계정 (header profile): 이용 현황 (FR-ACCT-04), 관심 기업 (FR-DISC-03), 회원 탈퇴 (FR-ACCT-05).
async function AccountContent() {
  const { repo, demo } = await userData();
  const cat = await catalog();
  let plan = { plan: "free", used: 1, quota: FREE_MONTHLY_QUOTA, remaining: FREE_MONTHLY_QUOTA - 1, passes: [] as { type: string; expiresAt: string | null; usesLeft: number | null }[] };
  let who: { email: string; google: boolean } | null = null;
  if (!demo && supabaseEnabled()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { currentPlan } = await import("@/lib/billing/server");
    const supabase = await createClient();
    plan = await currentPlan(supabase);
    const { data } = await supabase.auth.getClaims();
    const c = data?.claims as { email?: string; app_metadata?: { provider?: string } } | undefined;
    if (c?.email) who = { email: c.email, google: c.app_metadata?.provider === "google" };
  }
  return (
    <div className="mx-auto max-w-reading-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-1">내 계정</h1>
          {who && <p className="mt-1 text-body text-text-secondary">{who.google ? "Google 계정" : "이메일"} {who.email}으로 로그인했어요</p>}
        </div>
        {demo ? <DemoBadge /> : <LogoutButton />}
      </div>

      <section className="mt-6 space-y-4">
        <Kicker>이용 현황</Kicker>
        <div className="grid grid-cols-3 overflow-hidden rounded-container border border-border">
          <div className="border-r border-border p-4"><p className="text-caption text-text-secondary">이용 등급</p><p className="text-heading-2">{plan.plan === "premium" ? "프리미엄" : "무료"}</p></div>
          <div className="border-r border-border p-4"><p className="text-caption text-text-secondary">이번 달 남은 쿼터</p><p className="figures text-figure">{plan.remaining} / {plan.quota}</p></div>
          <div className="p-4"><p className="text-caption text-text-secondary">패스</p><p className="text-heading-3">{plan.passes.length ? plan.passes.map((p) => (p.type === "season" ? `시즌 (${p.expiresAt?.slice(0, 10)}까지)` : `건당 ${p.usesLeft}회`)).join(", ") : "없음"}</p></div>
        </div>
        <p className="text-body text-text-secondary">쿼터는 공고 정리, 카드 만들기, 연결 결과처럼 AI가 정리하는 기능에 써요. Prompt Kit은 쿼터를 쓰지 않고, 실패한 요청은 세지 않아요.</p>
        <Link href="/billing" className={btn.primary}>패스로 쿼터 늘리기</Link>
        {demo && <p className="text-caption text-text-secondary">데모 수치예요. 로그인하면 내 이용 현황이 보여요.</p>}
      </section>

      <section className="mt-10 space-y-3">
        <Kicker>관심 기업</Kicker>
        <WatchedList companies={await cat.companiesByIds(await repo.watchedCompanyIds())} initial={await repo.watchedCompanyIds()} />
      </section>

      {!demo && <DeleteAccount />}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountContent />
    </Suspense>
  );
}
