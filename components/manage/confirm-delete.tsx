"use client";
// 지우기 확인 (specs/portfolio PORT-05): the first press asks in place what will be lost; the second press deletes.
// Cancel takes the focus so an accidental double press does not delete. Deletion cannot be undone.
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = {
  /** button text, e.g. "에피소드 삭제" */
  label: string;
  /** what is lost, e.g. "이 에피소드와 대화 기록이 지워지고 되돌릴 수 없어요." */
  warning: string;
  onConfirm: () => Promise<{ ok?: string; error?: string }>;
  onDone?: () => void;
  compact?: boolean;
};

export function ConfirmDelete({ label, warning, onConfirm, onDone, compact }: Props) {
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      const r = await onConfirm();
      setMessage(r.ok ?? r.error ?? null);
      setAsking(false);
      if (r.ok) onDone?.();
    });
  }

  if (!asking) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setAsking(true);
          }}
          className={cn(btn.ghost, compact && btn.sm, "text-text-error hover:bg-error-muted")}
          aria-label={compact ? label : undefined}
          title={compact ? label : undefined}
        >
          <Trash2 className="size-4" aria-hidden />
          {compact ? null : label}
        </button>
        {message ? <p role="status" className="text-caption text-text-secondary">{message}</p> : null}
      </div>
    );
  }

  return (
    <div role="group" aria-label={`${label} 확인`} className="space-y-3 rounded-container border border-border-emphasized bg-error-muted p-3">
      <p className="text-label text-text-error">{warning}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={confirm} disabled={pending} className={cn(btn.sm, "inline-flex items-center gap-1 rounded-element bg-destructive font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60")}>
          <Trash2 className="size-4" aria-hidden />
          {pending ? "지우는 중…" : "지우기"}
        </button>
        <button type="button" autoFocus onClick={() => setAsking(false)} disabled={pending} className={cn(btn.ghost, btn.sm)}>
          취소
        </button>
      </div>
    </div>
  );
}
