import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { cancelOrderAction } from "../actions";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { btn } from "@/components/lg/ui";

type Props = { searchParams: Promise<{ code?: string; message?: string; orderId?: string }> };

// 결제 실패·취소 리다이렉트 (specs/billing E1): pending -> canceled, no pass is granted.
async function FailContent({ searchParams }: Props) {
  const sp = await searchParams;
  if (sp.orderId && /^[A-Za-z0-9_-]{6,64}$/.test(sp.orderId)) await cancelOrderAction(sp.orderId);
  const canceled = sp.code === "PAY_PROCESS_CANCELED";
  return (
    <div className="mx-auto max-w-reading-max space-y-4 px-5 py-16">
      <AlertTriangle className="size-8 text-warning" aria-hidden />
      <h1 className="text-heading-1">{canceled ? "결제를 취소했어요" : "결제가 되지 않았어요"}</h1>
      <p className="text-body-lg text-text-secondary">{canceled ? "패스는 부여되지 않았어요. 다시 시도할 수 있어요." : sp.message ?? "잠시 뒤 다시 시도해 주세요."}</p>
      <Link href="/billing" className={btn.secondary}>패스 화면으로</Link>
    </div>
  );
}

export default function BillingFailPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <FailContent {...props} />
    </Suspense>
  );
}
