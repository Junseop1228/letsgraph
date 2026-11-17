"use client";
// 탐색 > 조건 바꾸기 (D 2026-11-17 step 5c, control A): a chip in the glass bar shows the current conditions and opens a
// glass panel with the industry chips (related to my liked jobs, the same list as the onboarding card) and the company
// type. One apply button: ExploreGraph saves the same cookies as the onboarding deck and refreshes the page, so the
// server re-selects the companies (top N per industry passing the type filter).
import { useEffect, useRef, useState } from "react";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { Chip } from "@/components/lg/chip";
import { btn } from "@/components/lg/ui";
import { COMPANY_TYPES, type CompanyType } from "@/lib/explore/company-type";
import { conditionSummary } from "@/lib/explore/conditions";
import { cn } from "@/lib/utils";

export const CONDITION_PANEL_ID = "graph-conditions";

/** The chip in the glass bar. Text below lg is screen-reader only, like the other bar controls (audit M-7). */
export function ConditionButton({ industryCount, type, relaxed, open, pending, onClick }: { industryCount: number; type: CompanyType | null; relaxed: boolean; open: boolean; pending: boolean; onClick: () => void }) {
  const any = industryCount > 0 || !!type;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={CONDITION_PANEL_ID}
      onClick={onClick}
      className={cn(
        "relative flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-label lg:px-3",
        open ? "lg-seg-on text-text-primary" : any ? "text-text-primary hover:bg-overlay-hover" : "text-text-secondary hover:bg-overlay-hover hover:text-text-primary",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <SlidersHorizontal className="size-4" aria-hidden />}
      {any ? (
        <>
          <span className="sr-only">조건 바꾸기: </span>
          <span className="sr-only lg:not-sr-only">{conditionSummary(industryCount, type)}</span>
        </>
      ) : (
        <>
          <span className="sr-only lg:not-sr-only">조건</span>
          <span className="sr-only"> 바꾸기</span>
        </>
      )}
      {relaxed && (
        <>
          <i aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-graph-job" />
          <span className="sr-only">, 조건을 조금 넓혔어요</span>
        </>
      )}
    </button>
  );
}

type PanelProps = {
  /** industry chips: related to my liked jobs, plus chosen ones outside that list so they can be removed */
  industries: { id: string; name: string; count: number }[];
  chosen: string[];
  type: CompanyType | null;
  /** relax-and-tell lines (lib/explore/conditions.ts relaxNotes) */
  notes: string[];
  onApply: (industries: string[], type: CompanyType | null) => void;
  onClose: () => void;
};

/** Floats under the bar on wide screens and phones alike; frosted glass without the clear lens so it stays readable. */
export function ConditionPanel({ industries, chosen, type, notes, onApply, onClose }: PanelProps) {
  const [inds, setInds] = useState<string[]>(chosen);
  const [t, setT] = useState<CompanyType | null>(type);
  const ref = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // a tap outside closes the panel; the chip toggles it itself
    const onDown = (e: PointerEvent) => {
      const el = e.target;
      if (!(el instanceof Element) || ref.current?.contains(el) || el.closest(`[aria-controls="${CONDITION_PANEL_ID}"]`)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  const key = (l: string[]) => [...l].sort().join(",");
  const changed = key(inds) !== key(chosen) || t !== type;
  const toggle = (id: string) => setInds((l) => (l.includes(id) ? l.filter((v) => v !== id) : [...l, id]));
  const rule = t ? COMPANY_TYPES.find((x) => x.id === t)?.rule : null;

  return (
    <section
      id={CONDITION_PANEL_ID}
      ref={ref}
      role="dialog"
      aria-labelledby="graph-conditions-title"
      className="lg-glass lg-glass-card absolute inset-x-2 top-16 z-30 flex max-h-[calc(100%-4.5rem)] flex-col overflow-hidden rounded-sheet lg:left-4 lg:right-auto lg:w-floating-card-width"
    >
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 lg:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="graph-conditions-title" ref={headRef} tabIndex={-1} className="text-heading-2 outline-none">
              조건 바꾸기
            </h2>
            <p className="mt-1 text-caption text-text-secondary">조건에 맞는 기업을 산업마다 매출 순으로 다시 골라요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-8 shrink-0 place-items-center rounded-full text-text-secondary hover:bg-overlay-hover hover:text-text-primary">
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {notes.length > 0 && (
          <div className="rounded-2xl bg-overlay-hover px-4 py-3">
            <p className="text-label-strong">조건을 조금 넓혔어요</p>
            <ul className="mt-1 space-y-1 text-caption text-text-secondary">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-label-strong">산업</h3>
          <p className="mt-0.5 text-caption text-text-secondary">내 직무와 이어진 산업이에요. 안 고르면 직무와 가장 가까운 산업부터 보여드려요.</p>
          <div role="group" aria-label="산업" className="mt-3 flex flex-wrap gap-2">
            <Chip on={!inds.length} onClick={() => setInds([])}>
              상관없어요
            </Chip>
            {industries.map((ind) => (
              <Chip key={ind.id} on={inds.includes(ind.id)} onClick={() => toggle(ind.id)}>
                {ind.name}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-label-strong">회사 성격</h3>
          <p className="mt-0.5 text-caption text-text-secondary">하나만 골라요. 매출 크기와 최근 3년 성장으로만 나눠요.</p>
          <div role="group" aria-label="회사 성격" className="mt-3 flex flex-wrap gap-2">
            <Chip on={!t} onClick={() => setT(null)}>
              상관없어요
            </Chip>
            {COMPANY_TYPES.map((x) => (
              <Chip key={x.id} on={t === x.id} onClick={() => setT(x.id)}>
                {x.label}
              </Chip>
            ))}
          </div>
          {rule && <p className="mt-2 text-caption text-text-secondary">{rule}</p>}
        </div>
      </div>
      <div className="border-t border-border px-5 py-3 lg:px-6">
        <button type="button" disabled={!changed} onClick={() => onApply(inds, t)} className={cn(btn.primary, "w-full rounded-full disabled:opacity-50")}>
          그래프 바꾸기
        </button>
      </div>
    </section>
  );
}
