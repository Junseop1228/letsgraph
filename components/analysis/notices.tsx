// 경력 요건 안내 (specs/posting POST-06): shown before the user spends quota on a posting that may not fit them.
import { TriangleAlert } from "lucide-react";

export function CareerNotice({ notice }: { notice: string | null }) {
  if (!notice) return null;
  return (
    <p role="note" className="mt-4 flex items-start gap-2 rounded-container bg-warning-muted p-4 text-label text-text-warning">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {notice}
    </p>
  );
}

/** "이 결과는 예전 카드 기준이에요" (specs/connection, specs/prompt-kit): the cards changed after the result was made. */
export function StaleNotice({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="note" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-container border border-dashed border-border-emphasized bg-bg-sunken p-4">
      <p className="text-label text-text-secondary">{children}</p>
      {action}
    </div>
  );
}
