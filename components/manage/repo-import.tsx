"use client";
// 카드 탭 "GitHub 주소로 만들기" (specs/portfolio PORT-06): a public repository address -> one activity card with its link.
// Only GitHub repository addresses are accepted for now; anything else is refused before any request.
import { useActionState } from "react";
import Link from "next/link";
import { importActivityFromRepoAction } from "@/app/(main)/manage/chat-actions";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function RepoImport() {
  const [state, action, pending] = useActionState(importActivityFromRepoAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="repo-url" className="block text-label text-text-secondary">
        공개 GitHub 저장소 주소
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="repo-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          required
          placeholder="https://github.com/계정/저장소"
          className="h-control-md w-0 min-w-0 flex-1 rounded-element border border-border-emphasized bg-bg-surface px-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "저장소 읽는 중…" : "활동 카드 만들기"}
        </button>
      </div>
      <p className="text-support text-text-secondary">README와 설명, 사용 언어, 기간을 읽어 활동 카드를 만들어요. 지금은 GitHub 저장소만 넣을 수 있어요.</p>
      {state?.error ? (
        <p role="alert" className="text-label text-text-error">
          {state.error}
        </p>
      ) : state?.ok ? (
        <p role="status" className={cn("text-label text-text-secondary")}>
          {state.ok}
        </p>
      ) : null}
      {state?.pay ? <Link href="/billing" className={cn(btn.secondary, btn.sm)}>시즌 패스 보기</Link> : null}
    </form>
  );
}
