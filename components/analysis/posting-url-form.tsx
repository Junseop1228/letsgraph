"use client";
// 공고 주소로 정리하기 (specs/posting POST-03). Says what is fetched and that it goes to an AI before submit (NFR-EXT-05).
import { useActionState } from "react";
import { Link2 } from "lucide-react";
import type { ActionState } from "@/app/(main)/postings/actions";
import { btn } from "@/components/lg/ui";

type Props = { action: (prev: ActionState, form: FormData) => Promise<ActionState> };

export function PostingUrlForm({ action }: Props) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="space-y-3">
      <label htmlFor="posting-url" className="block text-label-strong">
        채용공고 주소
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-container border border-border-emphasized bg-bg-surface px-3 focus-within:ring-2 focus-within:ring-ring">
          <Link2 className="size-4 shrink-0 text-text-secondary" aria-hidden />
          <input
            id="posting-url"
            name="url"
            type="url"
            inputMode="url"
            required
            autoComplete="off"
            placeholder="https://"
            aria-describedby="posting-url-hint"
            className="h-control-md w-0 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-text-secondary"
          />
        </div>
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "가져오는 중…" : "주소로 정리하기"}
        </button>
      </div>
      <p id="posting-url-hint" className="text-caption text-text-secondary">
        넣은 주소의 페이지 한 개만 가져와서 생성형 AI(Gemini)로 정리해요. 로그인이 필요한 페이지나 이미지로만 된 공고는 읽지 못할 수 있어요.
      </p>
      {state?.error && <p role="alert" className="text-label text-text-error">{state.error}</p>}
      {state?.ok && <p role="status" className="text-label text-text-success">{state.ok}</p>}
    </form>
  );
}
