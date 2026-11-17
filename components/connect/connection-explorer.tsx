"use client";
// 지원 근거 화면 (specs/connection FR-PREM-02): the posting's conditions on the left, grouped as 핵심 역량 / 자격 요건 /
// 우대 사항, each with how strongly a card proves it. Picking one shows the recommended card on the right; opening the
// card shows its details as in 관리 > 카드, then why it fits, what is missing and what to do next.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import {
  EPISODE_THEME_LABEL,
  EXPERIENCE_KIND_LABEL,
  REQUIREMENT_KIND_LABEL,
  RequirementKind,
  STRENGTH_LABEL,
  type Activity,
  type EvidencePoint,
  type EvidenceStrength,
  type Experience,
} from "@/lib/contracts/activity";
import { STRENGTH_LEVEL } from "@/lib/connect/evidence";
import { ActivityTile } from "@/components/manage/activity-tile";
import { btn, Kicker, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = { evidence: EvidencePoint[]; activities: Activity[]; episodes: Experience[] };
const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Three squares, filled by strength (the same filled/hollow language as the S·T·A·R marks and the job map). */
export function StrengthMeter({ strength, className }: { strength: EvidenceStrength; className?: string }) {
  const n = STRENGTH_LEVEL[strength];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={cn("size-2.5 rounded-inner", i <= n ? "bg-graph-division" : "border border-graph-division")} />
        ))}
      </span>
      <span className="text-caption text-text-secondary">{STRENGTH_LABEL[strength]}</span>
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}

export function ConnectionExplorer({ evidence, activities, episodes }: Props) {
  const first = evidence.find((e) => e.cardType !== "none") ?? evidence[0];
  const [picked, setPicked] = useState<EvidencePoint | undefined>(first);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const card = useMemo(() => {
    if (!picked || picked.cardType === "none") return null;
    if (picked.cardType === "activity") {
      const a = activities.find((x) => x.id === picked.cardId);
      return a ? ({ type: "activity", a } as const) : null;
    }
    const e = episodes.find((x) => x.id === picked.cardId);
    return e ? ({ type: "episode", e, a: activities.find((x) => x.id === e.activityId) } as const) : null;
  }, [picked, activities, episodes]);
  const sameCard = picked && picked.cardId ? evidence.filter((x) => x !== picked && x.cardId === picked.cardId).map((x) => x.requirement) : [];

  function pick(e: EvidencePoint) {
    setPicked(e);
    setOpen(false);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-5 lg:items-start">
      <section aria-labelledby="conditions-title" className="min-w-0 space-y-5 lg:col-span-2">
        <Kicker>
          <span id="conditions-title">공고 조건</span>
        </Kicker>
        {RequirementKind.options.map((kind) => {
          const items = evidence.filter((e) => e.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind} className="space-y-2">
              <h2 className="text-label-strong text-text-secondary">{REQUIREMENT_KIND_LABEL[kind]}</h2>
              <ul className="space-y-2">
                {items.map((e) => {
                  const selected = e === picked;
                  const none = e.cardType === "none";
                  return (
                    <li key={e.kind + e.requirement}>
                      <button
                        type="button"
                        onClick={() => pick(e)}
                        aria-pressed={selected}
                        className={cn(
                          "flex min-h-row-height w-full flex-col items-start gap-1 rounded-element border px-3 py-2 text-left transition-colors",
                          focusRing,
                          selected ? "border-border-strong bg-bg-selected" : none ? "border-dashed border-border-emphasized hover:bg-overlay-hover" : "border-border-emphasized hover:bg-overlay-hover",
                        )}
                      >
                        <span className="text-label-strong break-keep">{e.requirement}</span>
                        <span className="flex w-full flex-wrap items-center justify-between gap-2">
                          <StrengthMeter strength={e.strength} />
                          {e.cardTitle ? <span className="truncate text-caption text-text-secondary">{e.cardTitle}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <section ref={panelRef} aria-labelledby="picked-title" className="min-w-0 scroll-mt-header-height space-y-4 rounded-container bg-bg-sunken p-5 lg:sticky lg:top-header-height lg:col-span-3">
        <Kicker right={card ? <TrustLabel p={{ kind: "ai", text: "AI 추천" }} /> : undefined}>추천 근거</Kicker>
        {!picked ? (
          <p className="text-body text-text-secondary">왼쪽에서 조건을 골라 보세요.</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-support text-text-secondary">{REQUIREMENT_KIND_LABEL[picked.kind]}</p>
              <h2 id="picked-title" className="text-heading-2 break-keep">{picked.requirement}</h2>
              <StrengthMeter strength={picked.strength} />
            </div>

            {card ? (
              <>
                <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="card-detail" className={cn("block w-full rounded-container text-left", focusRing)}>
                  {card.type === "activity" ? (
                    <ActivityTile activity={card.a} />
                  ) : (
                    <span className={cn("flex flex-col gap-2 rounded-container border bg-bg-surface p-4", open ? "border-border-strong" : "border-border hover:border-border-emphasized")}>
                      <span className="text-support text-text-secondary">
                        에피소드{card.a ? `, ${card.a.title}` : ""}
                        {card.e.theme ? `, ${EPISODE_THEME_LABEL[card.e.theme]}` : ""}
                      </span>
                      <span className="text-label-strong break-keep">{card.e.title}</span>
                      {card.e.situation ? <span className="text-support text-text-secondary line-clamp-2">{card.e.situation}</span> : null}
                    </span>
                  )}
                  <span className="mt-2 flex items-center gap-1 text-label text-text-secondary">
                    <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden />
                    {open ? "카드 접기" : "카드를 눌러 상세 보기"}
                  </span>
                </button>
                {open ? (
                  <div id="card-detail" className="rounded-container bg-bg-surface p-5">
                    {card.type === "activity" ? (
                      <dl className="space-y-3">
                        <Field label="종류·기간" value={[EXPERIENCE_KIND_LABEL[card.a.kind], card.a.period].filter(Boolean).join(", ")} />
                        <Field label="맡은 역할" value={card.a.role} />
                        <Field label="사용한 데이터" value={card.a.dataset} />
                        <Field label="요약" value={card.a.summary} />
                      </dl>
                    ) : (
                      <dl className="space-y-3">
                        <Field label="상황" value={card.e.situation} />
                        <Field label="맡은 일" value={card.e.role} />
                        <Field label="행동" value={card.e.action} />
                        <Field label="결과" value={card.e.result} />
                        <Field label="배운 점" value={card.e.learning} />
                      </dl>
                    )}
                  </div>
                ) : null}
                <div className="space-y-2 rounded-container border border-dashed border-border-ai bg-ai-muted p-4">
                  <p className="text-caption text-text-ai">왜 이 카드인가</p>
                  <p className="text-body">{picked.reason}</p>
                  {picked.missing ? (
                    <p className="text-body">
                      <span className="text-label-strong">부족한 점 </span>
                      {picked.missing}
                    </p>
                  ) : null}
                </div>
                {sameCard.length ? <p className="text-support text-text-secondary">이 카드는 {sameCard.join(", ")}에도 추천됐어요.</p> : null}
              </>
            ) : (
              <p className="text-body text-text-secondary">이 조건을 보여 줄 카드가 아직 없어요.</p>
            )}

            {picked.next ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-body">{picked.next}</p>
                {picked.next.includes("자격") ? null : (
                  <Link href="/manage?tab=chat" className={cn(btn.secondary, btn.sm)}>
                    <Plus className="size-4" aria-hidden /> 에피소드 꺼내러 가기
                  </Link>
                )}
              </div>
            ) : !card ? (
              <Link href="/manage?tab=chat" className={cn(btn.secondary, btn.sm)}>
                <Plus className="size-4" aria-hidden /> 에피소드 꺼내러 가기
              </Link>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
