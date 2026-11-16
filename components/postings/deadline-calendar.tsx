// 공고 달력 (specs/posting POST-02): month grid with postings on their deadline, side list of undated postings
// and a status summary. Server component (uses today's date in Seoul).
// Audit 2026-11-16: month navigation (P-3), phones get a deadline list instead of a 640px table (P-1),
// the nearest deadline leads the side panel as a big D-day (P-2).
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid, seoulToday } from "@/lib/calendar";
import { dDay } from "@/lib/format";
import { POSTING_STATUS_LABEL, type JobPosting } from "@/lib/contracts/activity";
import { Kicker } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export const STATUS_MARK: Record<JobPosting["status"], string> = {
  interested: "border border-text-primary",
  applied: "bg-text-primary",
  interview: "rounded-full bg-text-primary",
  passed: "bg-[repeating-linear-gradient(45deg,var(--color-text-primary)_0_2px,transparent_2px_4px)] border border-text-primary",
  rejected: "border border-dashed border-text-secondary",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM" from ?month=, else this month (Seoul). */
function pickMonth(month: string | undefined, today: string): [number, number] {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return [Number(m[1]), Number(m[2])];
  const [y, mm] = today.split("-").map(Number);
  return [y, mm];
}
function shift(y: number, m: number, by: number) {
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function DeadlineCalendar({ postings, month }: { postings: JobPosting[]; month?: string }) {
  const today = seoulToday();
  const [y, m] = pickMonth(month, today);
  const ym = `${y}-${pad(m)}`;
  const isThisMonth = today.startsWith(ym);
  const weeks = monthGrid(y, m);
  const byDay = new Map<string, JobPosting[]>();
  for (const p of postings) if (p.deadline) byDay.set(p.deadline, [...(byDay.get(p.deadline) ?? []), p]);
  const inMonth = postings.filter((p) => p.deadline?.startsWith(ym)).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));
  const upcoming = postings.filter((p) => !p.deadline || p.deadline >= today);
  const counts = { interested: 0, applied: 0, interview: 0 } as Record<string, number>;
  for (const p of postings) if (p.status in counts) counts[p.status]++;
  const next = upcoming.filter((p) => p.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
  const navBtn = "grid size-8 place-items-center rounded-element text-text-secondary hover:bg-overlay-hover hover:text-text-primary";

  return (
    <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* min-w-0: the 640px table must scroll inside its box instead of widening the page on phones */}
      <section className="min-w-0 bg-bg-page py-6 lg:pr-6">
        <div className="flex items-center gap-1">
          <p className="figures mr-2 text-heading-2">{y}.{pad(m)}</p>
          <Link href={`/postings?month=${shift(y, m, -1)}`} aria-label="이전 달" className={navBtn}><ChevronLeft className="size-4" aria-hidden /></Link>
          <Link href={`/postings?month=${shift(y, m, 1)}`} aria-label="다음 달" className={navBtn}><ChevronRight className="size-4" aria-hidden /></Link>
          {!isThisMonth && <Link href="/postings" className="ml-1 rounded-element px-2 py-1 text-label text-text-secondary hover:bg-overlay-hover hover:text-text-primary">이번 달</Link>}
        </div>

        {/* phones: deadlines of the month as a list */}
        <ul className="mt-4 md:hidden">
          {inMonth.length === 0 && <li className="rounded-container bg-bg-sunken p-4 text-label text-text-secondary">이 달에 마감하는 공고가 없어요.</li>}
          {inMonth.map((p) => (
            <li key={p.id} className="border-b border-border">
              <Link href={`/postings/${p.id}`} className="flex items-center gap-3 py-3">
                <span className="figures w-14 shrink-0 text-label text-text-secondary">{p.deadline!.slice(5).replace("-", ".")} ({weekday(p.deadline!)})</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label-strong">{p.companyName} · {p.title}</span>
                  <span className="flex items-center gap-1.5 text-caption text-text-secondary"><i aria-hidden className={cn("size-2", STATUS_MARK[p.status])} />{POSTING_STATUS_LABEL[p.status]}</span>
                </span>
                <span className="figures shrink-0 text-label">{dDay(p.deadline)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-label">
            <thead>
              <tr>{WEEKDAYS.map((d) => <th key={d} scope="col" className="border-b border-border py-2 text-left font-normal text-text-secondary">{d}</th>)}</tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i}>
                  {w.map((d) => (
                    <td key={d.iso} className={cn("h-24 border border-border p-1.5 align-top", !d.inMonth && "bg-bg-sunken text-text-secondary")}>
                      <span className={cn("figures inline-block min-w-6 rounded-inner px-1 text-center", d.iso === today && "bg-bg-inverted text-text-inverted")}>{d.day}</span>
                      {(byDay.get(d.iso) ?? []).map((p) => (
                        <Link key={p.id} href={`/postings/${p.id}`} className="mt-1 flex items-center gap-1.5 rounded-inner border border-border-emphasized px-1.5 py-1 text-caption hover:bg-overlay-hover">
                          <span className="shrink-0 rounded-inner bg-bg-tonal px-1 text-text-secondary">{POSTING_STATUS_LABEL[p.status]}</span>
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
      <aside className="min-w-0 space-y-5 bg-bg-sunken p-5">
        {postings.length === 0 && (
          <div className="rounded-container bg-bg-surface p-4">
            <p className="text-label-strong">아직 저장한 공고가 없어요</p>
            <p className="mt-1 text-label text-text-secondary">위에서 공고 주소를 넣으면 정리해서 마감일에 맞춰 이 달력에 놓아 드려요.</p>
          </div>
        )}
        <div className="rounded-container bg-bg-surface p-4">
          <p className="text-caption text-text-secondary">가장 가까운 마감</p>
          {next ? (
            <Link href={`/postings/${next.id}`} className="mt-1 block rounded-element hover:underline">
              <span className="figures text-figure">{dDay(next.deadline)}</span>
              <span className="mt-0.5 block text-label">{next.companyName} · {next.title}</span>
            </Link>
          ) : (
            <p className="mt-1 text-label">없음</p>
          )}
          <p className="mt-2 text-caption text-text-secondary">D-day는 서울 시간 기준이에요.</p>
        </div>
        {upcoming.some((p) => !p.deadline) && (
        <div>
          <Kicker>마감일 미정</Kicker>
          <ul className="mt-2">
            {upcoming.filter((p) => !p.deadline).map((p) => (
              <li key={p.id} className="border-b border-border py-2 text-label">
                <Link href={`/postings/${p.id}`} className="hover:underline">{p.companyName} · {p.title}</Link>
                <span className="block text-caption text-text-secondary">{p.deadlineNote}</span>
              </li>
            ))}
          </ul>
        </div>
        )}
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
        </div>
      </aside>
    </div>
  );
}
