"use client";
// 처음 볼 때 만들기 (specs/data-pipeline FR-OPS-03): shown on a company page without segments. Starts the B1/B2
// analysis once, shows progress, then reloads the page data; on failure it falls back to the 준비 중 notice.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { EmptyState, btn } from "@/components/lg/ui";
import { buildCompanyDetail } from "@/app/(main)/company/[id]/actions";

export function BuildDetail({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    buildCompanyDetail(companyId)
      .then((r) => (r.ok ? router.refresh() : setFailed(r.message ?? "사업보고서를 정리하지 못했어요.")))
      .catch(() => setFailed("사업보고서를 정리하지 못했어요. 잠시 뒤 다시 열어 주세요."));
  }, [companyId, router]);

  if (failed)
    return <EmptyState title="상세 정보 준비 중이에요" body={failed} action={<Link href="/explore/map" className={btn.secondary}>직무 맵으로</Link>} />;
  return (
    <div role="status" aria-live="polite" className="flex items-start gap-4 rounded-container bg-bg-sunken p-6">
      <Loader2 className="mt-1 size-5 shrink-0 animate-spin text-text-secondary" aria-hidden />
      <div>
        <p className="text-heading-3">사업보고서를 읽고 사업부를 정리하고 있어요</p>
        <p className="mt-1 text-body text-text-secondary">처음 여는 기업이라 30초쯤 걸려요. DART 사업보고서의 사업 내용을 AI가 정리해요.</p>
      </div>
    </div>
  );
}
