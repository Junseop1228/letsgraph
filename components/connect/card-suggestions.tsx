"use client";
// 새 카드 맞춤 제안 (specs/connection FR-PREM-02b): after a card is saved, the open conditions of the user's postings it
// could prove better, each with "근거로 넣기". Nothing is shown while there is nothing to suggest (no pass, no
// connected postings, or no fit), so free users never see an empty box.
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { applyCardSuggestionAction, suggestForCardAction } from "@/app/(main)/connect/actions";
import { STRENGTH_LABEL } from "@/lib/contracts/activity";
import type { CardSuggestion } from "@/lib/connect/suggest";
import { btn, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function CardSuggestions({ cardType, cardId, onClose }: { cardType: "activity" | "episode"; cardId: string; onClose: () => void }) {
  const [items, setItems] = useState<CardSuggestion[] | null>(null);
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    suggestForCardAction(cardType, cardId)
      .then((r) => alive && setItems(r.suggestions))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [cardType, cardId]);

  if (!items?.length) return null;
  return (
    <section aria-label="새 카드 맞춤 제안" className="space-y-3 rounded-container border border-dashed border-border-ai bg-ai-muted p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-label-strong">방금 저장한 카드가 근거가 될 수 있어요</p>
          <p className="text-caption text-text-secondary">지금보다 근거가 강해지는 공고 조건이에요.</p>
        </div>
        <div className="flex items-center gap-1">
          <TrustLabel p={{ kind: "ai", text: "AI 제안" }} />
          <button type="button" onClick={onClose} aria-label="제안 닫기" className={cn(btn.ghost, btn.sm)}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.key} className="space-y-1.5 rounded-element bg-bg-surface p-3">
            <p className="text-caption text-text-secondary">{s.posting}</p>
            <p className="text-label-strong">{s.requirement}</p>
            <p className="text-caption">
              <span className="text-text-secondary">{STRENGTH_LABEL[s.current]}</span>
              <span className="text-text-secondary"> → </span>
              <span className="font-semibold text-text-ai">{STRENGTH_LABEL[s.strength]}</span>
            </p>
            <p className="text-support text-text-secondary">{s.reason}</p>
            {applied[s.key] ? (
              <p role="status" className="text-caption">
                {applied[s.key]}{" "}
                <Link href={`/connect/${s.postingId}`} className="underline underline-offset-2">
                  지원 근거 보기
                </Link>
              </p>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await applyCardSuggestionAction({
                      postingId: s.postingId,
                      index: Number(s.key.split("#")[1]),
                      requirement: s.requirement,
                      cardType,
                      cardId,
                      strength: s.strength,
                      reason: s.reason,
                    });
                    setApplied((a) => ({ ...a, [s.key]: r.ok ?? r.error ?? "" }));
                  })
                }
                className={cn(btn.secondary, btn.sm)}
              >
                근거로 넣기
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
