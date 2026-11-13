"use client";
// 결제창 열기 (Toss Payments SDK v2, test mode). The server creates the order and fixes the amount first.
import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { createOrderAction } from "@/app/(main)/billing/actions";
import { btn } from "@/components/lg/ui";

export function CheckoutButton({ passType, label, enabled }: { passType: "season" | "single"; label: string; enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const order = await createOrderAction(passType);
      if ("error" in order) {
        setErr(order.error);
        return;
      }
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      const payment = toss.payment({ customerKey: order.customerKey });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail`,
      });
    } catch {
      setErr("결제창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" disabled={!enabled || busy} onClick={start} className={btn.primary}>
        {busy ? "결제창 여는 중…" : label}
      </button>
      {!enabled && <p className="text-caption text-text-secondary">결제(테스트 모드)는 키가 연결되면 열려요.</p>}
      {err && <p role="alert" className="text-label text-text-error">{err}</p>}
    </div>
  );
}
