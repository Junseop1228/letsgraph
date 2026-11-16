"use client";
// 직무 카드 온보딩 (specs/explore FR-DISC-01). Drag right = 관심 있어요, left = 관심 없어요; buttons and arrow keys do the same.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, Undo2, X } from "lucide-react";
import type { JobRole } from "@/lib/contracts/domain";
import { savePrimaryJob } from "@/lib/client/local-state";
import { markOnboarded } from "@/lib/onboarding";
import { track } from "@/lib/client/analytics";
import { btn } from "@/components/lg/ui";

type Props = { jobs: (JobRole & { familyName: string })[] };

/** Arrow keys swipe only when the user is not typing or inside a dialog (e.g. the Ctrl+K search). */
function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest("input, textarea, select, [contenteditable=true], [role=dialog]");
}

export function OnboardingDeck({ jobs }: Props) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [history, setHistory] = useState<boolean[]>([]); // one entry per decided card, for 되돌리기 (audit O-2)
  const busy = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const done = i >= jobs.length;

  // Shown once = seen: from now on "/", "/explore" and the 탐색 tab open the graph (specs/explore FR-DISC-01).
  useEffect(() => markOnboarded(), []);

  function decide(like: boolean) {
    if (done || busy.current) return; // ignore clicks while the card is flying out
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

  function goMap(jobId: string) {
    savePrimaryJob(jobId, liked);
    track("onboarding_done", { job: jobId, liked: liked.length });
    router.push(`/explore/map?job=${encodeURIComponent(jobId)}`);
  }

  return (
    <div className="grid min-h-[calc(100vh-var(--spacing-header-height))] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="flex flex-col justify-center gap-3 border-b border-border bg-bg-sunken px-6 py-6 md:gap-4 md:border-b-0 md:border-r md:px-8 md:py-12">
        {/* step label instead of a bare page number (audit O-3) */}
        <p className="figures text-data-sm text-text-secondary">{done ? "2 / 2 · 대표 직무" : "1 / 2 · 관심 직무"}</p>
        <h1 className="text-heading-1 md:text-display">어떤 일이 궁금하세요?</h1>
        <p className="hidden max-w-[28rem] text-body-lg text-text-secondary md:block">
          카드를 넘기면, 고른 직무가 있는 기업과 그 기업이 돈 버는 구조를 보여드려요.
        </p>
        <p className="text-caption text-text-secondary">직무 카드 {jobs.length}장 · 1분이면 충분해요 · 로그인 없이 써요</p>
      </section>

      <section className="flex flex-col items-center justify-center gap-5 px-6 py-8 md:gap-6 md:py-12" aria-live="polite">
        {!done ? (
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
            <button type="button" className="text-caption text-text-secondary underline-offset-4 hover:underline" onClick={() => goMap(jobs[0].id)}>
              건너뛰고 직무 맵 보기
            </button>
          </>
        ) : (
          <div className="w-full max-w-105 rounded-container border border-border p-6">
            <h2 className="text-heading-2">{liked.length ? "대표 직무를 하나 골라요" : "관심 직무가 없어요"}</h2>
            <p className="mt-1 text-body text-text-secondary">
              {liked.length ? "대표 직무가 이후 화면의 기준이 돼요. 나중에 바꿀 수 있어요." : "직무 맵에서 직접 골라도 돼요."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(liked.length ? liked : jobs.slice(0, 3).map((j) => j.id)).map((id) => {
                const j = jobs.find((x) => x.id === id)!;
                return (
                  <button key={id} type="button" className={btn.outline} onClick={() => goMap(id)}>
                    {j.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4">
              <button type="button" className="text-caption text-text-secondary hover:underline" onClick={undo}>
                마지막 카드 다시 보기
              </button>
              <button type="button" className="text-caption text-text-secondary hover:underline" onClick={() => { setI(0); setLiked([]); setHistory([]); }}>
                처음부터 다시
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
