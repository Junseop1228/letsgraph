"use client";
// 가져온 직무 지우기 (specs/data-pipeline FR-OPS-04): asks once, then removes one imported page and its links.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCompanyPageAction } from "@/app/(main)/admin/company-jobs/actions";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function DeleteImport({ companyId, sourceUrl, label }: { companyId: string; sourceUrl: string; label: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={cn(btn.ghost, btn.sm, "text-text-error")} aria-label={`${label} 지우기`}>
        지우기
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-caption text-text-secondary">이 페이지에서 가져온 직무와 연결을 지울까요?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await deleteCompanyPageAction(companyId, sourceUrl); setAsking(false); router.refresh(); })}
        className={cn(btn.outline, btn.sm, "text-text-error")}
      >
        {pending ? "지우는 중…" : "지우기"}
      </button>
      <button type="button" onClick={() => setAsking(false)} className={cn(btn.ghost, btn.sm)}>취소</button>
    </span>
  );
}
