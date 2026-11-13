"use client";
// PDF upload form for server actions (공고 정리, 경험 카드). Tells the user the file goes to an AI before upload (NFR-EXT-05).
import { useActionState } from "react";
import { FileUp } from "lucide-react";
import type { ActionState } from "@/app/(main)/analysis/actions";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  label: string;
  hint: string;
  submit: string;
};

export function PdfUpload({ action, label, hint, submit }: Props) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-container border border-dashed border-border-emphasized bg-bg-surface px-4 py-4 hover:bg-overlay-hover">
        <FileUp className="size-5 text-text-secondary" aria-hidden />
        <span className="flex-1">
          <span className="block text-label-strong">{label}</span>
          <span className="block text-caption text-text-secondary">{hint}</span>
        </span>
        <input name="file" type="file" accept="application/pdf,.pdf" required className="max-w-[12rem] text-caption file:mr-2 file:rounded-element file:border-0 file:bg-bg-tonal file:px-3 file:py-1.5 file:text-label" />
      </label>
      <p className="text-caption text-text-secondary">올린 파일은 내용을 정리하려고 생성형 AI(Gemini)로 보내요. 정리가 끝나면 원본 파일은 저장하지 않아요.</p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "정리하는 중…" : submit}
        </button>
        {state?.error && <p role="alert" className={cn("text-label text-text-error")}>{state.error}</p>}
        {state?.ok && <p role="status" className="text-label text-text-success">{state.ok}</p>}
      </div>
    </form>
  );
}
