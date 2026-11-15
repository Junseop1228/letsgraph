"use client";
// 공고 내용 붙여넣기 (specs/posting POST-04): for pages that load the posting with JavaScript or need a login.
// Says that the text goes to an AI before submit (NFR-EXT-05).
import { useActionState } from "react";
import type { ActionState } from "@/app/(main)/postings/actions";
import { btn } from "@/components/lg/ui";

type Props = { action: (prev: ActionState, form: FormData) => Promise<ActionState> };

export function PostingTextForm({ action }: Props) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="space-y-3">
      <label htmlFor="posting-text" className="block text-label-strong">
        공고 내용 붙여넣기
      </label>
      <textarea
        id="posting-text"
        name="text"
        required
        rows={6}
        maxLength={20000}
        placeholder="공고 페이지에서 전체 선택(Ctrl+A) 후 복사(Ctrl+C)해서 붙여넣어요."
        aria-describedby="posting-text-hint"
        className="block w-full resize-y rounded-container border border-border-emphasized bg-bg-surface p-3 text-body outline-none placeholder:text-text-secondary focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p id="posting-text-hint" className="text-caption text-text-secondary">
        메뉴나 다른 글이 섞여도 괜찮아요. 붙여넣은 내용은 정리하려고 생성형 AI(Gemini)로 보내요.
      </p>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btn.secondary}>
          {pending ? "정리하는 중…" : "붙여넣은 내용으로 정리하기"}
        </button>
        {state?.error && <p role="alert" className="text-label text-text-error">{state.error}</p>}
        {state?.ok && <p role="status" className="text-label text-text-success">{state.ok}</p>}
      </div>
    </form>
  );
}
