"use client";
// 공고 근거 지우기 버튼 (specs/safety SAFE-03): asks once, then removes one evidence row or all rows of one creator.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteByCreatorAction, deleteEvidenceAction } from "@/app/(main)/admin/evidence/actions";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function EvidenceDelete({ id, creator, count }: { id?: string; creator?: string; count?: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = creator ? `이 흔적의 근거 ${count ?? ""}개 모두 지우기` : "지우기";
  if (!asking) {
    return (
      <span className="flex items-center gap-2">
        <button type="button" onClick={() => setAsking(true)} className={cn(btn.ghost, btn.sm, "text-text-error")}>
          {label}
        </button>
        {note ? <span role="status" className="text-caption text-text-secondary">{note}</span> : null}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-caption text-text-secondary">{creator ? "같은 사람이 만든 근거를 모두 지울까요?" : "이 근거를 지울까요?"}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = creator ? await deleteByCreatorAction(creator) : await deleteEvidenceAction(id!);
            setNote(r.ok ?? r.error ?? null);
            setAsking(false);
            router.refresh();
          })
        }
        className={cn(btn.outline, btn.sm, "text-text-error")}
      >
        {pending ? "지우는 중…" : "지우기"}
      </button>
      <button type="button" onClick={() => setAsking(false)} className={cn(btn.ghost, btn.sm)}>
        취소
      </button>
    </span>
  );
}
