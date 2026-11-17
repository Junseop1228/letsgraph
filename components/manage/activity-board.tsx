"use client";
// 카드 보드 (specs/portfolio PORT-03): one row per activity, top to bottom; its episodes run to the right of it.
// Choosing an activity tile or an episode card opens it in the side panel (below the board on narrow screens).
// The panel can be folded to give the board the full width; choosing a card opens it again.
// ?act=<id> or ?ep=<id> deep-links a selection.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsLeft, ChevronsRight, MessagesSquare, Plus } from "lucide-react";
import { EPISODE_THEME_LABEL, EXPERIENCE_KIND_LABEL, type Activity, type Experience } from "@/lib/contracts/activity";
import { boardRows, starParts } from "@/lib/manage/board";
import { ActivityTile } from "@/components/manage/activity-tile";
import { ConfirmDelete } from "@/components/manage/confirm-delete";
import { deleteActivityAction, deleteEpisodeAction } from "@/app/(main)/manage/card-actions";
import { btn, EmptyState, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Selection = { type: "activity" | "episode"; id: string } | null;
type Props = { activities: Activity[]; episodes: Experience[]; initialEpisodeId?: string; initialActivityId?: string };

/** 대화 로그로 가기: the 만들기 tab on the episode's activity, with that episode's conversation opened. */
const logHref = (a: Activity, e: Experience) => `/manage?tab=chat&activity=${encodeURIComponent(a.id)}&log=${encodeURIComponent(e.id)}`;
const chatHref = (a?: Activity | null) => (a ? `/manage?tab=chat&activity=${encodeURIComponent(a.id)}` : "/manage?tab=chat");
const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function StarMarks({ e }: { e: Experience }) {
  const parts = starParts(e);
  return (
    <span className="flex gap-1" role="img" aria-label={parts.map((p) => `${p.label} ${p.done ? "있음" : "비어 있음"}`).join(", ")}>
      {parts.map((p) => (
        <span
          key={p.key}
          aria-hidden
          className={cn(
            "grid size-4 place-items-center rounded-inner text-data-sm",
            p.done ? "bg-graph-division text-text-inverted" : "border border-graph-division text-text-secondary",
          )}
        >
          {p.key}
        </span>
      ))}
    </span>
  );
}

function EpisodeCard({ e, selected, onSelect }: { e: Experience; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex h-full w-56 flex-col gap-3 rounded-container border p-4 text-left transition-colors",
        focusRing,
        selected ? "border-border-strong bg-bg-selected" : "border-border bg-bg-surface hover:border-border-emphasized",
      )}
    >
      {e.theme ? <span className={cn("text-support", selected ? "text-text-primary" : "text-text-secondary")}>{EPISODE_THEME_LABEL[e.theme]}</span> : null}
      <span className="text-label-strong line-clamp-2 break-keep">{e.title}</span>
      {e.situation ? <span className={cn("text-support line-clamp-2", selected ? "text-text-primary" : "text-text-secondary")}>{e.situation}</span> : null}
      <span className="mt-auto flex items-center justify-between gap-2">
        <StarMarks e={e} />
        <span className="flex min-w-0 gap-1">
          {e.competencies.slice(0, 2).map((c) => (
            <span key={c} className="truncate rounded-inner bg-bg-tonal px-1.5 text-data-sm text-text-secondary">
              {c}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className={cn("text-body", !value && "text-text-secondary")}>{value || "아직 비어 있어요"}</dd>
    </div>
  );
}

function ActivityDetail({ a, count, onDeleted }: { a: Activity; count: number; onDeleted: () => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-support text-text-secondary">
          {EXPERIENCE_KIND_LABEL[a.kind]}
          {a.period ? <span className="figures">{`  ${a.period}`}</span> : null}
        </p>
        <h2 className="text-heading-2 break-keep">{a.title}</h2>
      </div>
      <dl className="space-y-3">
        {a.role ? <Field label="맡은 역할" value={a.role} /> : null}
        {a.dataset ? <Field label="사용한 데이터" value={a.dataset} /> : null}
        {a.link ? (
          <a href={a.link} target="_blank" rel="noreferrer" className="block truncate text-label underline underline-offset-2">
            GitHub 저장소 {a.link.replace("https://github.com/", "")}
          </a>
        ) : null}
        <Field label="요약" value={a.summary} />
      </dl>
      {a.scenes?.length ? (
        <div className="space-y-1">
          <p className="text-label text-text-secondary">장면 후보</p>
          <ul className="list-disc space-y-0.5 pl-5 text-body">
            {a.scenes.map((s) => (
              <li key={s.title}>{s.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-label">
          에피소드 <span className="figures">{count}</span>개
        </p>
        <TrustLabel p={{ kind: "ai", text: "AI 정리" }} />
      </div>
      <Link href={chatHref(a)} className={cn(btn.primary, "w-full justify-center")}>
        이 활동에서 에피소드 꺼내기
      </Link>
      <div className="border-t border-border pt-4">
        <ConfirmDelete
          label="활동 삭제"
          warning={count ? `이 활동과 에피소드 ${count}개, 그 대화 기록이 함께 지워지고 되돌릴 수 없어요.` : "이 활동이 지워지고 되돌릴 수 없어요."}
          onConfirm={() => deleteActivityAction(a.id)}
          onDone={onDeleted}
        />
      </div>
    </div>
  );
}

function EpisodeDetail({ e, activity, onDeleted }: { e: Experience; activity: Activity | null; onDeleted: () => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-support text-text-secondary">
          {activity ? activity.title : "활동에 묶이지 않은 에피소드"}
          <span className="figures">{e.period ? `  ${e.period}` : ""}</span>
        </p>
        <h2 className="text-heading-2 break-keep">{e.title}</h2>
        {e.theme ? <p className="text-label text-text-secondary">{EPISODE_THEME_LABEL[e.theme]}</p> : null}
      </div>
      <dl className="space-y-3">
        <Field label="상황" value={e.situation} />
        <Field label="맡은 일" value={e.role} />
        <Field label="행동" value={e.action} />
        <Field label="결과" value={e.result} />
        <Field label="배운 점" value={e.learning} />
      </dl>
      {e.competencies.length ? (
        <div className="flex flex-wrap gap-1.5">
          {e.competencies.map((c) => (
            <span key={c} className="rounded-inner bg-bg-tonal px-2 text-data-sm leading-6">
              {c}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <TrustLabel p={{ kind: "ai", text: "AI 정리" }} />
        <span className="text-caption text-text-secondary">{EXPERIENCE_KIND_LABEL[e.kind]}</span>
      </div>
      {activity && e.chatLog?.length ? (
        <Link href={logHref(activity, e)} className={cn(btn.outline, "w-full justify-center")}>
          <MessagesSquare className="size-4" aria-hidden />
          대화 로그로 가기
        </Link>
      ) : (
        <p className="text-support text-text-secondary">이 에피소드는 대화 기록이 없어요.</p>
      )}
      <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
        <ConfirmDelete
          key={`ep-${e.id}`}
          label="에피소드 삭제"
          warning="이 에피소드와 대화 기록이 지워지고 되돌릴 수 없어요."
          onConfirm={() => deleteEpisodeAction(e.id)}
          onDone={onDeleted}
        />
      </div>
    </div>
  );
}

export function ActivityBoard({ activities, episodes, initialEpisodeId, initialActivityId }: Props) {
  const rows = useMemo(() => boardRows(activities, episodes), [activities, episodes]);
  const [selection, setSelection] = useState<Selection>(() => {
    if (initialEpisodeId && episodes.some((e) => e.id === initialEpisodeId)) return { type: "episode", id: initialEpisodeId };
    if (initialActivityId && activities.some((a) => a.id === initialActivityId)) return { type: "activity", id: initialActivityId };
    return null;
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const detailRef = useRef<HTMLElement>(null);

  const episode = selection?.type === "episode" ? (episodes.find((e) => e.id === selection.id) ?? null) : null;
  const activity =
    selection?.type === "activity"
      ? (activities.find((a) => a.id === selection.id) ?? null)
      : episode?.activityId
        ? (activities.find((a) => a.id === episode.activityId) ?? null)
        : null;

  function select(next: NonNullable<Selection>) {
    setSelection(next);
    setPanelOpen(true);
    window.history.replaceState(null, "", `/manage?tab=cards&${next.type === "episode" ? "ep" : "act"}=${encodeURIComponent(next.id)}`);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
    }
  }

  if (!rows.length) {
    return (
      <div className="py-6">
        <EmptyState title="아직 카드가 없어요" body="위의 '활동 카드 만들기'에서 PDF를 올리거나 AI와 대화로 첫 활동을 만들어 보세요." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-start">
      <ul className="min-w-0 flex-1" aria-label="활동별 에피소드">
        {rows.map(({ activity: a, episodes: list }) => {
          const label = a ? a.title : "활동에 묶이지 않은 에피소드";
          const tileSelected = !!a && selection?.type === "activity" && selection.id === a.id;
          return (
            <li key={a?.id ?? "loose"} className="flex flex-col gap-3 border-b border-border py-5 first:pt-0 md:flex-row md:items-stretch md:gap-0">
              {a ? (
                <button
                  type="button"
                  onClick={() => select({ type: "activity", id: a.id })}
                  aria-pressed={tileSelected}
                  className={cn("rounded-container text-left md:w-56 md:shrink-0", focusRing, tileSelected && "ring-2 ring-border-strong ring-offset-2 ring-offset-bg-page")}
                >
                  <ActivityTile activity={a} episodeCount={list.length} className="h-full" />
                  {/* name = the visible tile text + this, so speech users can say what they see (axe label-content-name-mismatch) */}
                  <span className="sr-only"> 자세히 보기</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-container bg-bg-sunken p-4 md:w-56 md:shrink-0">
                  <p className="text-heading-3 break-keep">{label}</p>
                  <p className="text-support text-text-secondary">활동을 정하기 전에 만든 카드예요.</p>
                </div>
              )}
              <div className="relative min-w-0 flex-1">
                {/* the edge from the activity to its episodes: a short stub before each episode card, so it ends at the last card */}
                
                <ul className="relative flex snap-x gap-3 overflow-x-auto pb-2 md:pl-6 md:scroll-pl-6" aria-label={`${label} 에피소드`}>
                  {list.map((e) => (
                    <li key={e.id} className="relative shrink-0 snap-start before:absolute before:right-full before:top-1/2 before:hidden before:h-px before:w-3 before:bg-graph-edge first:before:w-6 md:before:block">
                      <EpisodeCard e={e} selected={selection?.type === "episode" && selection.id === e.id} onSelect={() => select({ type: "episode", id: e.id })} />
                    </li>
                  ))}
                  {a ? (
                    <li className="shrink-0 snap-start">
                      <Link
                        href={chatHref(a)}
                        className={cn(
                          "flex h-full min-h-32 w-36 flex-col items-start justify-center gap-2 rounded-container border border-dashed border-border-emphasized bg-bg-page p-4 text-label text-text-secondary hover:text-text-primary",
                          focusRing,
                        )}
                      >
                        <Plus className="size-4" aria-hidden />
                        {list.length ? "에피소드 더 찾기" : "첫 에피소드 꺼내기"}
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>

      {panelOpen ? (
        <aside
          ref={detailRef}
          aria-label="자세히"
          className="scroll-mt-header-height rounded-container bg-bg-sunken lg:sticky lg:top-header-height lg:w-drawer-width lg:shrink-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <p className="text-label-strong">자세히</p>
            <button type="button" onClick={() => setPanelOpen(false)} className={cn(btn.ghost, btn.sm)} aria-label="자세히 접기">
              <ChevronsRight className="size-4" aria-hidden />
              접기
            </button>
          </div>
          <div className="p-5">
            {episode ? (
              <EpisodeDetail key={episode.id} e={episode} activity={activity} onDeleted={() => setSelection(null)} />
            ) : activity ? (
              <ActivityDetail key={activity.id} a={activity} count={episodes.filter((e) => e.activityId === activity.id).length} onDeleted={() => setSelection(null)} />
            ) : (
              <div className="space-y-2">
                <p className="text-heading-3">활동이나 에피소드를 골라 보세요</p>
                <p className="text-body text-text-secondary">검은 활동 타일이나 에피소드 카드를 누르면 여기에서 자세히 볼 수 있어요.</p>
              </div>
            )}
          </div>
        </aside>
      ) : (
        <aside ref={detailRef} aria-label="자세히" className="lg:sticky lg:top-header-height lg:shrink-0">
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label="자세히 펼치기"
            className={cn("flex w-full items-center justify-center gap-2 rounded-container bg-bg-sunken px-3 py-3 text-label text-text-secondary hover:text-text-primary lg:w-12 lg:flex-col lg:py-5", focusRing)}
          >
            <ChevronsLeft className="size-4" aria-hidden />
            <span className="lg:sr-only">자세히</span>
          </button>
        </aside>
      )}
    </div>
  );
}
