import { LoginPrompt } from "@/components/lg/login-prompt";
import Link from "next/link";
import { Suspense } from "react";
import { catalog, supabaseEnabled, userData } from "@/lib/data";
import { FREE_LIMITS, PASS_CATALOG, POSTING_DAILY_LIMIT, type PassType } from "@/lib/contracts/billing";
import type { PlanState } from "@/lib/billing/server";
import { DemoBadge, Kicker, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { WatchedList } from "@/components/manage/watched-list";
import { DeleteAccount } from "@/components/manage/delete-account";
import { LogoutButton } from "@/components/logout-button";

export const metadata = { title: "내 계정 · letsGraph" };

// 내 계정 (header profile): 이용 현황 (FR-ACCT-04), 관심 기업 (FR-DISC-03), 회원 탈퇴 (FR-ACCT-05).
async function AccountContent() {
  const { repo, demo, guest } = await userData();
  if (guest) return <LoginPrompt next="/account" title="로그인이 필요해요" text="로그인하면 이용 현황, 패스, 관심 기업을 볼 수 있어요." />;
  const cat = await catalog();
  let plan: PlanState = { plan: "free", used: { activity_save: 1, episode_save: 1 }, remaining: { activity_save: FREE_LIMITS.activity_save - 1, episode_save: FREE_LIMITS.episode_save - 1 }, passes: [] };
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
          <div className="border-r border-border p-4">
            <p className="text-caption text-text-secondary">무료로 남은 저장</p>
            {plan.plan === "premium" ? (
              <p className="text-heading-2">무제한</p>
            ) : (
              <p className="text-label-strong">
                활동 <span className="figures">{plan.remaining.activity_save} / {FREE_LIMITS.activity_save}</span>
                <br />
                에피소드 <span className="figures">{plan.remaining.episode_save} / {FREE_LIMITS.episode_save}</span>
              </p>
            )}
          </div>
          <div className="p-4"><p className="text-caption text-text-secondary">패스</p><p className="text-heading-3">{plan.passes.filter((p) => p.type in PASS_CATALOG).map((p) => `${PASS_CATALOG[p.type as PassType].name} ${p.expiresAt?.slice(0, 10)}까지`).join(", ") || "없음"}</p></div>
        </div>
        <p className="text-body text-text-secondary">공고는 하루 {POSTING_DAILY_LIMIT}건까지 정리할 수 있어요. 무료로는 활동과 에피소드를 각각 {FREE_LIMITS.activity_save}개까지 저장할 수 있고, 지워도 다시 채워지지 않아요. 연결 결과와 프롬프트 키트는 패스로 열리고, 패스가 있으면 저장 한도가 없어요.</p>
        {plan.plan === "premium" ? null : <Link href="/billing" className={btn.primary}>패스 보기</Link>}
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
