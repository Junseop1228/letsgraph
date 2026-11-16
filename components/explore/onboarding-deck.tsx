"use client";
// 직무 카드 온보딩 (specs/explore FR-DISC-01; D 2026-11-17 onboarding card flow + job taxonomy):
// 직군 칩 카드 -> 고른 직군의 직무 카드 넘기기 (drag right = 관심 있어요, left = 관심 없어요; buttons and arrow keys
// do the same) -> 산업 칩 카드 (고른 직무와 이어진 산업만) -> 나의 취업 그래프. The first liked job opens the graph.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Undo2, X } from "lucide-react";
import type { JobFamily, JobRole } from "@/lib/contracts/domain";
import { savePrimaryJob } from "@/lib/client/local-state";
import { markOnboarded, saveIndustryChoice } from "@/lib/onboarding";
import { JOB_INDUSTRY } from "@/lib/reference/job-industry";
import { track } from "@/lib/client/analytics";
import { btn } from "@/components/lg/ui";

type Job = JobRole & { familyName: string };
type Props = {
  /** 직군 that have at least one job, in display order */
  families: JobFamily[];
  /** every job, grouped by 직군 */
  jobs: Job[];
  /** industries with reviewed companies */
  industries: { id: string; name: string; count: number }[];
};

/** industry chips shown at most on the industry card */
const MAX_INDUSTRY_CHIPS = 12;

/** Arrow keys swipe only when the user is not typing or inside a dialog (e.g. the Ctrl+K search). */
function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest("input, textarea, select, [contenteditable=true], [role=dialog]");
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={on ? btn.primary : btn.outline}>
      {on && <Check className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

export function OnboardingDeck({ families, jobs: allJobs, industries }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"family" | "jobs">("family");
  const [fams, setFams] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [history, setHistory] = useState<boolean[]>([]); // one entry per decided card, for 되돌리기 (audit O-2)
  const [inds, setInds] = useState<string[]>([]);
  const busy = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);

  // no 직군 picked = every job card
  const jobs = useMemo(() => (fams.length ? allJobs.filter((j) => fams.includes(j.groupId)) : allJobs), [allJobs, fams]);
  const done = stage === "jobs" && i >= jobs.length;
  const pickIndustry = done && liked.length > 0;

  // industries related to any liked job (strongest relevance first, then the ones with more companies)
  const related = useMemo(() => {
    const rel = (id: string) => Math.max(0, ...liked.map((j) => JOB_INDUSTRY[j]?.[id] ?? 0));
    return industries
      .filter((ind) => rel(ind.id) > 0)
      .sort((a, b) => rel(b.id) - rel(a.id) || b.count - a.count)
      .slice(0, MAX_INDUSTRY_CHIPS);
  }, [liked, industries]);

  // Shown once = seen: from now on "/", "/explore" and the 탐색 tab open the graph (specs/explore FR-DISC-01).
  useEffect(() => markOnboarded(), []);

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
  }

  function startCards() {
    setI(0);
    setLiked([]);
    setHistory([]);
    setInds([]);
    setStage("jobs");
  }

  function restart() {
    setFams([]);
    setI(0);
    setLiked([]);
    setHistory([]);
    setInds([]);
    setStage("family");
  }

  function decide(like: boolean) {
    if (stage !== "jobs" || done || busy.current) return; // ignore clicks while the card is flying out
    busy.current = true;
    const job = jobs[i];
    animate(x, like ? 480 : -480, { duration: 0.2, ease: "easeOut" }).then(() => {
      x.set(0);
      setLiked((l) => (like ? [...l, job.id] : l));
      setHistory((h) => [...h, like]);
      setI((n) => n + 1);
      busy.current = false;
    });
  }

  function undo() {
    if (busy.current || i === 0) return;
    const job = jobs[i - 1];
    if (history[history.length - 1]) setLiked((l) => l.filter((id) => id !== job.id));
    setHistory((h) => h.slice(0, -1));
    setInds([]);
    setI((n) => n - 1);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === "ArrowRight") decide(true);
      if (e.key === "ArrowLeft") decide(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function goMap(jobId: string, chosen: string[]) {
    saveIndustryChoice(chosen);
    savePrimaryJob(jobId, liked);
    track("onboarding_done", { job: jobId, liked: liked.length, industries: chosen.length });
    router.push(`/explore/map?job=${encodeURIComponent(jobId)}`);
  }

  const skip = () => goMap(liked[0] ?? jobs[0]?.id ?? allJobs[0].id, []);
  const step = stage === "family" ? "1 / 3 · 직군" : pickIndustry ? "3 / 3 · 산업" : "2 / 3 · 관심 직무";
  const count =
    stage === "family" ? `직군 ${families.length}개` : pickIndustry ? `산업 ${related.length}개` : `직무 카드 ${jobs.length}장`;

  return (
    <div className="grid min-h-[calc(100vh-var(--spacing-header-height))] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="flex flex-col justify-center gap-3 border-b border-border bg-bg-sunken px-6 py-6 md:gap-4 md:border-b-0 md:border-r md:px-8 md:py-12">
        {/* step label instead of a bare page number (audit O-3) */}
        <p className="figures text-data-sm text-text-secondary">{step}</p>
        <h1 className="text-heading-1 md:text-display">어떤 일이 궁금하세요?</h1>
        <p className="hidden max-w-[28rem] text-body-lg text-text-secondary md:block">
          카드를 넘기면, 고른 직무가 있는 기업과 그 기업이 돈 버는 구조를 보여드려요.
        </p>
        <p className="text-caption text-text-secondary">{count} · 1분이면 충분해요 · 로그인 없이 써요</p>
      </section>

      <section className="flex flex-col items-center justify-center gap-5 px-6 py-8 md:gap-6 md:py-12" aria-live="polite">
        {stage === "family" ? (
          <div className="w-full max-w-105 rounded-container border border-border p-6">
            <h2 className="text-heading-2">관심 있는 직군을 골라요</h2>
            <p className="mt-1 text-body text-text-secondary">여러 개 골라도 돼요. 고른 직군의 직무 카드만 넘겨요.</p>
            <div role="group" aria-label="직군" className="mt-4 flex flex-wrap gap-2">
              {families.map((f) => (
                <Chip key={f.id} on={fams.includes(f.id)} onClick={() => setFams((l) => toggle(l, f.id))}>
                  {f.name}
                </Chip>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" className={btn.primary} onClick={startCards}>
                직무 카드 넘기기
              </button>
              <p className="text-caption text-text-secondary">
                {fams.length ? `직무 카드 ${jobs.length}장` : "안 고르면 모든 직무 카드를 넘겨요"}
              </p>
            </div>
          </div>
        ) : !done ? (
          <>
            <div className="relative h-75 w-full max-w-85 md:h-90">
              {jobs.slice(i + 1, i + 3).map((j, k) => (
                <div
                  key={j.id}
                  aria-hidden
                  className="absolute inset-0 rounded-container border border-border bg-bg-sunken"
                  style={{ transform: `translate(${(k + 1) * 6}px, ${(k + 1) * 6}px)`, zIndex: 1 - k }}
                />
              ))}
              <motion.article
                key={jobs[i].id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.9}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 120) decide(true);
                  else if (info.offset.x < -120) decide(false);
                }}
                style={{ x, rotate, zIndex: 5 }}
                className="absolute inset-0 flex cursor-grab flex-col rounded-container border border-border bg-bg-surface p-6 active:cursor-grabbing"
                aria-label={`${jobs[i].name} 카드`}
              >
                <p className="figures text-data-sm text-text-secondary">
                  {String(i + 1).padStart(2, "0")} / {String(jobs.length).padStart(2, "0")}
                </p>
                <p className="mt-1 text-label text-text-secondary">{jobs[i].familyName}</p>
                <h2 className="mt-auto text-display">{jobs[i].name}</h2>
                <p className="mt-2 text-body text-text-secondary">{jobs[i].description}</p>
              </motion.article>
            </div>
            <div className="flex gap-2">
              <button type="button" className={btn.secondary} onClick={() => decide(false)} aria-keyshortcuts="ArrowLeft">
                <X className="size-4" aria-hidden /> 관심 없어요
                <kbd aria-hidden className="ml-1 hidden opacity-60 lg:inline">←</kbd>
              </button>
              <button type="button" className={btn.primary} onClick={() => decide(true)} aria-keyshortcuts="ArrowRight">
                <Check className="size-4" aria-hidden /> 관심 있어요
                <kbd aria-hidden className="ml-1 hidden opacity-60 lg:inline">→</kbd>
              </button>
            </div>
            {/* the 01 / 06 counter on the card is the progress; dots removed (audit O-1). Undo the last card (audit O-2). */}
            <button
              type="button"
              onClick={undo}
              disabled={i === 0}
              className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-caption text-text-secondary hover:bg-overlay-hover hover:text-text-primary disabled:invisible"
            >
              <Undo2 className="size-3.5" aria-hidden /> 되돌리기
            </button>
            <div className="flex gap-4">
              <button type="button" className="text-caption text-text-secondary underline-offset-4 hover:underline" onClick={restart}>
                직군 다시 고르기
              </button>
              <button type="button" className="text-caption text-text-secondary underline-offset-4 hover:underline" onClick={skip}>
                건너뛰고 직무 맵 보기
              </button>
            </div>
          </>
        ) : pickIndustry ? (
          <div className="w-full max-w-105 rounded-container border border-border p-6">
            <h2 className="text-heading-2">어떤 산업이 궁금하세요?</h2>
            <p className="mt-1 text-body text-text-secondary">
              고른 직무와 이어진 산업이에요. 안 고르면 직무와 가장 가까운 산업부터 보여드려요.
            </p>
            {related.length ? (
              <div role="group" aria-label="산업" className="mt-4 flex flex-wrap gap-2">
                <Chip on={!inds.length} onClick={() => setInds([])}>
                  상관없어요
                </Chip>
                {related.map((ind) => (
                  <Chip key={ind.id} on={inds.includes(ind.id)} onClick={() => setInds((l) => toggle(l, ind.id))}>
                    {ind.name}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-body text-text-secondary">고른 직무와 이어진 산업이 아직 없어요.</p>
            )}
            <div className="mt-6">
              <button type="button" className={btn.primary} onClick={() => goMap(liked[0], inds)}>
                내 그래프 보기
              </button>
            </div>
            <div className="mt-4 flex gap-4">
              <button type="button" className="text-caption text-text-secondary hover:underline" onClick={undo}>
                마지막 카드 다시 보기
              </button>
              <button type="button" className="text-caption text-text-secondary hover:underline" onClick={restart}>
                처음부터 다시
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-105 rounded-container border border-border p-6">
            <h2 className="text-heading-2">관심 직무가 없어요</h2>
            <p className="mt-1 text-body text-text-secondary">직무 맵에서 직접 골라도 돼요.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {jobs.slice(0, 3).map((j) => (
                <button key={j.id} type="button" className={btn.outline} onClick={() => goMap(j.id, [])}>
                  {j.name}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-4">
              <button type="button" className="text-caption text-text-secondary hover:underline" onClick={undo}>
                마지막 카드 다시 보기
              </button>
              <button type="button" className="text-caption text-text-secondary hover:underline" onClick={restart}>
                처음부터 다시
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
