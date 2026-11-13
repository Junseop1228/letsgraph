import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { catalog, supabaseEnabled, userData } from "@/lib/data";
import { monthGrid, seoulToday } from "@/lib/calendar";
import { dDay } from "@/lib/format";
import { EXPERIENCE_KIND_LABEL, POSTING_STATUS_LABEL, type Experience, type JobPosting } from "@/lib/contracts/activity";
import { FREE_MONTHLY_QUOTA } from "@/lib/contracts/billing";
import { DemoBadge, Kicker, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { WatchedList } from "@/components/manage/watched-list";
import { PdfUpload } from "@/components/analysis/pdf-upload";
import { extractExperiencesAction } from "@/app/(main)/analysis/actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "관리 · LetsGraph" };

const TABS = [
  { id: "watched", label: "관심 기업" },
  { id: "calendar", label: "마감 달력" },
  { id: "cards", label: "경험 카드" },
  { id: "usage", label: "이용 현황" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const STATUS_MARK: Record<JobPosting["status"], string> = {
  interested: "border border-text-primary",
  applied: "bg-text-primary",
  interview: "rounded-full bg-text-primary",
  passed: "bg-[repeating-linear-gradient(45deg,var(--color-text-primary)_0_2px,transparent_2px_4px)] border border-text-primary",
  rejected: "border border-dashed border-text-secondary",
};

function Calendar({ postings }: { postings: JobPosting[] }) {
  const today = seoulToday();
  const [y, m] = today.split("-").map(Number);
  const weeks = monthGrid(y, m);
  const byDay = new Map<string, JobPosting[]>();
  for (const p of postings) if (p.deadline) byDay.set(p.deadline, [...(byDay.get(p.deadline) ?? []), p]);
  const upcoming = postings.filter((p) => !p.deadline || p.deadline >= today);
  const counts = { interested: 0, applied: 0, interview: 0 } as Record<string, number>;
  for (const p of postings) if (p.status in counts) counts[p.status]++;

  return (
    <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="bg-bg-page py-6 lg:pr-6">
        <p className="figures text-heading-2">{y}.{String(m).padStart(2, "0")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-label">
            <thead>
              <tr>{["일", "월", "화", "수", "목", "금", "토"].map((d) => <th key={d} className="border-b border-border py-2 text-left font-normal text-text-secondary">{d}</th>)}</tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i}>
                  {w.map((d) => (
                    <td key={d.iso} className={cn("h-24 border border-border p-1.5 align-top", !d.inMonth && "bg-bg-sunken text-text-secondary")}>
                      <span className={cn("figures inline-block min-w-6 rounded-inner px-1 text-center", d.iso === today && "bg-bg-inverted text-text-inverted")}>{d.day}</span>
                      {(byDay.get(d.iso) ?? []).map((p) => (
                        <Link key={p.id} href={`/analysis/posting/${p.id}`} className="mt-1 flex items-center gap-1.5 rounded-inner border border-border-emphasized px-1.5 py-1 text-caption hover:bg-overlay-hover">
                          <i aria-hidden className={cn("size-2 shrink-0", STATUS_MARK[p.status])} />
                          <span className="truncate">{p.companyName} · {p.title}</span>
                        </Link>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="space-y-5 bg-bg-sunken p-5">
        <div>
          <Kicker>마감일 미정</Kicker>
          <ul className="mt-2">
            {upcoming.filter((p) => !p.deadline).map((p) => (
              <li key={p.id} className="border-b border-border py-2 text-label">{p.companyName} · {p.title}<span className="block text-caption text-text-secondary">{p.deadlineNote}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <Kicker>상태 요약</Kicker>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["interested", "applied", "interview"] as const).map((s) => (
              <div key={s} className="rounded-element bg-bg-surface p-3 text-center">
                <p className="figures text-figure">{counts[s]}</p>
                <p className="text-caption text-text-secondary">{POSTING_STATUS_LABEL[s]}</p>
              </div>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-caption text-text-secondary">
            {(Object.keys(STATUS_MARK) as JobPosting["status"][]).map((s) => (
              <li key={s} className="flex items-center gap-2"><i aria-hidden className={cn("size-2.5", STATUS_MARK[s])} />{POSTING_STATUS_LABEL[s]}</li>
            ))}
          </ul>
        </div>
        <p className="text-caption text-text-secondary">D-day는 서울 시간 기준이에요. 가장 가까운 마감: {upcoming[0] ? `${upcoming[0].companyName} ${dDay(upcoming[0].deadline)}` : "없음"}</p>
      </aside>
    </div>
  );
}

function Cards({ experiences }: { experiences: Experience[] }) {
  const groups = new Map<string, Experience[]>();
  for (const e of experiences) groups.set(e.sourceLabel ?? "직접 입력", [...(groups.get(e.sourceLabel ?? "직접 입력") ?? []), e]);
  return (
    <div className="space-y-6 py-6">
      <PdfUpload action={extractExperiencesAction} label="포트폴리오·자기소개서 PDF" hint="파일 속 경험을 카드로 나눠 정리해요. 10MB까지." submit="경험 카드 만들기" />
      {[...groups.entries()].map(([label, list]) => (
        <section key={label} className="space-y-3">
          <Kicker right={<span className="figures text-caption text-text-secondary">에피소드 {list.length}</span>}>{label}</Kicker>
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((e) => (
              <li key={e.id} className="space-y-2 rounded-container border border-border p-4">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-heading-3">{e.title}</span>
                  <span className="h-[22px] rounded-inner bg-bg-tonal px-2 text-data-sm leading-[22px] text-text-secondary">{EXPERIENCE_KIND_LABEL[e.kind]}</span>
                </p>
                {e.period && <p className="figures text-caption text-text-secondary">{e.period}</p>}
                <dl className="space-y-1 text-body">
                  {[["상황", e.situation], ["행동", e.action], ["결과", e.result]].map(([k, v]) => v ? (
                    <div key={k} className="grid grid-cols-[40px_1fr] gap-2"><dt className="text-label text-text-secondary">{k}</dt><dd>{v}</dd></div>
                  ) : null)}
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  {e.competencies.map((c) => <span key={c} className="h-[22px] rounded-inner bg-bg-tonal px-2 text-data-sm leading-[22px]">{c}</span>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function Usage({ demo }: { demo: boolean }) {
  let plan = { plan: "free", used: 1, quota: FREE_MONTHLY_QUOTA, remaining: FREE_MONTHLY_QUOTA - 1, passes: [] as { type: string; expiresAt: string | null; usesLeft: number | null }[] };
  if (!demo && supabaseEnabled()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { currentPlan } = await import("@/lib/billing/server");
    plan = await currentPlan(await createClient());
  }
  return (
    <div className="max-w-reading-max space-y-5 py-6">
      <div className="grid grid-cols-3 overflow-hidden rounded-container border border-border">
        <div className="border-r border-border p-4"><p className="text-caption text-text-secondary">이용 등급</p><p className="text-heading-2">{plan.plan === "premium" ? "프리미엄" : "무료"}</p></div>
        <div className="border-r border-border p-4"><p className="text-caption text-text-secondary">이번 달 남은 쿼터</p><p className="figures text-figure">{plan.remaining} / {plan.quota}</p></div>
        <div className="p-4"><p className="text-caption text-text-secondary">패스</p><p className="text-heading-3">{plan.passes.length ? plan.passes.map((p) => (p.type === "season" ? `시즌 (${p.expiresAt?.slice(0, 10)}까지)` : `건당 ${p.usesLeft}회`)).join(", ") : "없음"}</p></div>
      </div>
      <p className="text-body text-text-secondary">쿼터는 공고 정리, 경험 카드 만들기, 연결 결과, Prompt Kit처럼 AI를 쓰는 기능에만 써요. 실패한 요청은 세지 않아요.</p>
      <Link href="/billing" className={btn.primary}>패스로 쿼터 늘리기</Link>
      {demo && <p className="text-caption text-text-secondary">데모 수치예요. 로그인하면 내 이용 현황이 보여요.</p>}
    </div>
  );
}

async function ManageContent({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await connection(); // request-time render: uses today's date and the user's data
  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.id === sp.tab)?.id ?? "watched") as Tab;
  const { repo, demo } = await userData();
  const cat = await catalog();
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-heading-1">관리</h1>
        {demo && <DemoBadge />}
      </div>
      <nav aria-label="관리 메뉴" className="mt-4 flex gap-1 border-b border-border pb-2">
        {TABS.map((t) => (
          <Link key={t.id} href={`/manage?tab=${t.id}`} aria-current={t.id === tab ? "page" : undefined} className={cn("h-9 rounded-element px-3.5 text-label-strong leading-9", t.id === tab ? "bg-bg-selected" : "text-text-secondary hover:bg-overlay-hover")}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "watched" && <div className="max-w-reading-max py-6"><WatchedList companies={await cat.companies()} initial={await repo.watchedCompanyIds()} /></div>}
      {tab === "calendar" && <Calendar postings={await repo.postings()} />}
      {tab === "cards" && <Cards experiences={await repo.experiences()} />}
      {tab === "usage" && <Usage demo={demo} />}
    </div>
  );
}

export default function ManagePage(props: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageContent {...props} />
    </Suspense>
  );
}
