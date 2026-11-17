import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { TossSuccessQuery, PASS_CATALOG } from "@/lib/contracts/billing";
import { confirmAndGrant, tossEnabled } from "@/lib/billing/confirm";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { btn } from "@/components/lg/ui";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// 결제 성공 리다이렉트: amount check -> confirm API -> grant (specs/billing). Safe to reload (idempotent).
async function SuccessContent({ searchParams }: Props) {
  const parsed = TossSuccessQuery.safeParse(await searchParams);
  const result = !parsed.success
    ? { ok: false as const, message: "결제 정보가 올바르지 않아요." }
    : !tossEnabled()
      ? { ok: false as const, message: "결제(테스트 모드)가 아직 연결되지 않았어요." }
      : await confirmAndGrant(parsed.data);

  return (
    <div className="mx-auto max-w-reading-max px-5 py-16">
      {result.ok ? (
        <div className="space-y-4">
          <CheckCircle2 className="size-8 text-success" aria-hidden />
          <h1 className="text-heading-1">{PASS_CATALOG[result.passType].name}를 받았어요</h1>
          <p className="text-body-lg text-text-secondary">이제 연결 결과 전체와 프롬프트 키트를 쓸 수 있어요.</p>
          <div className="flex gap-2">
            <Link href="/postings" className={btn.primary}>분석으로</Link>
            <Link href="/account" className={btn.secondary}>이용 현황</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AlertTriangle className="size-8 text-warning" aria-hidden />
          <h1 className="text-heading-1">결제를 마치지 못했어요</h1>
          <p className="text-body-lg text-text-secondary">{result.message}</p>
          <Link href="/billing" className={btn.secondary}>패스 화면으로</Link>
        </div>
      )}
    </div>
  );
}

export default function BillingSuccessPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <SuccessContent {...props} />
    </Suspense>
  );
}
