"use client";
import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/app/(main)/manage/account-actions";
import { btn, Kicker } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

const WIPED = ["관심 정보와 관심 기업", "올린 공고와 공고 정리", "경험 카드와 경험 대화", "연결 결과와 프롬프트 키트", "남은 패스와 쿼터"];

/** 회원 탈퇴 (specs/account FR-ACCT-05): shows what is deleted, asks for a typed confirmation. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useActionState(deleteAccountAction, undefined);
  return (
    <section className="mt-10 space-y-3 border-t border-border pt-6">
      <Kicker>회원 탈퇴</Kicker>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={cn(btn.ghost, "text-text-error")}>탈퇴하기</button>
      ) : (
        <form action={run} className="space-y-3 rounded-container border border-border p-5">
          <p className="text-body">탈퇴하면 아래 정보가 지워지고 되돌릴 수 없어요.</p>
          <ul className="space-y-1 text-body text-text-secondary">
            {WIPED.map((w) => <li key={w}>· {w}</li>)}
          </ul>
          <p className="text-caption text-text-secondary">결제 기록은 법에 따라 개인 정보와 분리해 보관해요.</p>
          <label className="block space-y-1">
            <span className="text-label">계속하려면 <b>탈퇴합니다</b>를 입력해 주세요</span>
            <input name="confirm" autoComplete="off" className="h-control-md w-full rounded-element border border-border-emphasized bg-bg-surface px-3 text-body outline-none focus:border-accent" />
          </label>
          {state?.error && <p role="alert" className="text-label text-text-error">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={cn(btn.secondary, "text-text-error")}>{pending ? "처리하는 중…" : "탈퇴하기"}</button>
            <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>취소</button>
          </div>
        </form>
      )}
    </section>
  );
}
