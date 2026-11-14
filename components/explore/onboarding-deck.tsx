"use client";
// 직무 카드 온보딩 (specs/explore FR-DISC-01). Drag right = 관심 있어요, left = 관심 없어요; buttons and arrow keys do the same.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, X } from "lucide-react";
import type { JobRole } from "@/lib/contracts/domain";
import { savePrimaryJob } from "@/lib/client/local-state";
import { track } from "@/lib/client/analytics";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = { jobs: (JobRole & { familyName: string })[] };

export function OnboardingDeck({ jobs }: Props) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const busy = useRef(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-8, 8]);
  const done = i >= jobs.length;

  function decide(like: boolean) {
    if (done || busy.current) return; // ignore clicks while the card is flying out
    busy.current = true;
    const job = jobs[i];
    animate(x, like ? 480 : -480, { duration: 0.2, ease: "easeOut" }).then(() => {
      x.set(0);
      setLiked((l) => (like ? [...l, job.id] : l));
      setI((n) => n + 1);
      busy.current = false;
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      <section className="flex flex-col justify-center gap-4 border-r border-border bg-bg-sunken px-8 py-12">
        <p className="text-data-sm text-text-secondary">LETSGRAPH / 01</p>
        <h1 className="text-display">어떤 일이 궁금하세요?</h1>
        <p className="max-w-[28rem] text-body-lg text-text-secondary">
          카드를 넘기면, 고른 직무가 있는 기업과 그 기업이 돈 버는 구조를 보여드려요.
        </p>
        <p className="text-caption text-text-secondary">직무 카드 {jobs.length}장 · 1분이면 충분해요 · 로그인 없이 써요</p>
      </section>

      <section className="flex flex-col items-center justify-center gap-6 px-6 py-12" aria-live="polite">
        {!done ? (
          <>
            <div className="relative h-[360px] w-full max-w-[340px]">
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
              <button type="button" className={btn.secondary} onClick={() => decide(false)}>
                <X className="size-4" aria-hidden /> 관심 없어요
              </button>
              <button type="button" className={btn.primary} onClick={() => decide(true)}>
                <Check className="size-4" aria-hidden /> 관심 있어요
              </button>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {jobs.map((j, k) => (
                <i key={j.id} className={cn("size-2 rounded-full border border-border-emphasized", k < i && "border-text-primary bg-text-primary")} />
              ))}
            </div>
            <button type="button" className="text-caption text-text-secondary underline-offset-4 hover:underline" onClick={() => goMap(jobs[0].id)}>
              건너뛰고 직무 맵 보기
            </button>
          </>
        ) : (
          <div className="w-full max-w-[420px] rounded-container border border-border p-6">
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
            <button type="button" className="mt-4 text-caption text-text-secondary hover:underline" onClick={() => { setI(0); setLiked([]); }}>
              처음부터 다시
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
