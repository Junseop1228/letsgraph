// 공고 달력 (specs/posting POST-02): month grid with postings on their deadline, side list of undated postings
// and a status summary. Server component (uses today's date in Seoul).
import Link from "next/link";
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

export function DeadlineCalendar({ postings }: { postings: JobPosting[] }) {
  const today = seoulToday();
  const [y, m] = today.split("-").map(Number);
  const weeks = monthGrid(y, m);
  const byDay = new Map<string, JobPosting[]>();
  for (const p of postings) if (p.deadline) byDay.set(p.deadline, [...(byDay.get(p.deadline) ?? []), p]);
  const upcoming = postings.filter((p) => !p.deadline || p.deadline >= today);
  const counts = { interested: 0, applied: 0, interview: 0 } as Record<string, number>;
  for (const p of postings) if (p.status in counts) counts[p.status]++;
  const next = upcoming.filter((p) => p.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];

  return (
    <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="bg-bg-page py-6 lg:pr-6">
        <p className="figures text-heading-2">{y}.{String(m).padStart(2, "0")}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-label">
            <thead>
              <tr>{["일", "월", "화", "수", "목", "금", "토"].map((d) => <th key={d} scope="col" className="border-b border-border py-2 text-left font-normal text-text-secondary">{d}</th>)}</tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={i}>
                  {w.map((d) => (
                    <td key={d.iso} className={cn("h-24 border border-border p-1.5 align-top", !d.inMonth && "bg-bg-sunken text-text-secondary")}>
                      <span className={cn("figures inline-block min-w-6 rounded-inner px-1 text-center", d.iso === today && "bg-bg-inverted text-text-inverted")}>{d.day}</span>
                      {(byDay.get(d.iso) ?? []).map((p) => (
                        <Link key={p.id} href={`/postings/${p.id}`} className="mt-1 flex items-center gap-1.5 rounded-inner border border-border-emphasized px-1.5 py-1 text-caption hover:bg-overlay-hover">
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
              <li key={p.id} className="border-b border-border py-2 text-label">
                <Link href={`/postings/${p.id}`} className="hover:underline">{p.companyName} · {p.title}</Link>
                <span className="block text-caption text-text-secondary">{p.deadlineNote}</span>
              </li>
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
        <p className="text-caption text-text-secondary">D-day는 서울 시간 기준이에요. 가장 가까운 마감: {next ? `${next.companyName} ${dDay(next.deadline)}` : "없음"}</p>
      </aside>
    </div>
  );
}
