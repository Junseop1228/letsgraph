// Toss Payments confirm + pass grant, driven by the payment state machine (specs/billing FR-ACCT-03).
// Test mode only (decisions 2026-11-09). Server only: uses the Toss secret key and the Supabase secret key.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { amountMatches, transition } from "@/lib/billing/state";
import { PASS_CATALOG, type PaymentStatus, type PassType, type TossSuccessQuery } from "@/lib/contracts/billing";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export type ConfirmResult =
  | { ok: true; status: "granted"; passType: PassType }
  | { ok: false; status: PaymentStatus; message: string };

export const tossEnabled = () => !!process.env.TOSS_SECRET_KEY && !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

async function setStatus(orderId: string, from: PaymentStatus, to: PaymentStatus, extra: Record<string, unknown> = {}) {
  // compare-and-set on the current status keeps concurrent redirects from double-processing
  const { data } = await createAdminClient()
    .from("orders")
    .update({ status: to, updated_at: new Date().toISOString(), ...extra })
    .eq("id", orderId)
    .eq("status", from)
    .select("id");
  return (data?.length ?? 0) > 0;
}

export async function confirmAndGrant(q: TossSuccessQuery, fetchImpl: typeof fetch = fetch): Promise<ConfirmResult> {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("*").eq("id", q.orderId).maybeSingle();
  if (!order) return { ok: false, status: "failed", message: "주문을 찾지 못했어요." };
  let status = order.status as PaymentStatus;

  // replayed redirect: report the current state, change nothing
  if (status === "granted") return { ok: true, status: "granted", passType: order.pass_type };
  if (status === "grant_failed") return { ok: false, status, message: "결제는 됐고 패스 지급을 확인하고 있어요. 곧 처리해 드릴게요." };

  if (!amountMatches(order.amount, q.amount)) {
    const t = transition(status, "amount_mismatch");
    if (t.ok && t.changed) await setStatus(order.id, status, t.status, { failure_reason: "amount_mismatch" });
    return { ok: false, status: "failed", message: "결제 금액이 주문과 달라 결제를 진행하지 않았어요." };
  }

  const toConfirming = transition(status, "success_redirect");
  if (!toConfirming.ok) return { ok: false, status, message: "이미 처리된 주문이에요." };
  if (toConfirming.changed) {
    if (!(await setStatus(order.id, status, "confirming", { payment_key: q.paymentKey }))) return { ok: false, status, message: "이미 처리 중인 주문이에요." };
    status = "confirming";
  }

  if (status === "confirming") {
    const auth = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64");
    const res = await fetchImpl(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", "Idempotency-Key": order.id },
      body: JSON.stringify({ paymentKey: q.paymentKey, orderId: order.id, amount: order.amount }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      await setStatus(order.id, "confirming", "failed", { failure_reason: body.code ?? `HTTP ${res.status}` });
      return { ok: false, status: "failed", message: body.message ?? "결제 승인에 실패했어요." };
    }
    await setStatus(order.id, "confirming", "paid");
    status = "paid";
  }

  // grant (one pass per order: passes.order_id is unique)
  const def = PASS_CATALOG[order.pass_type as PassType];
  if (!def) {
    // an order for a pass type that no longer exists (the single pass, dropped 2026-11-18): an operator settles it
    await setStatus(order.id, "paid", "grant_failed", { failure_reason: `unknown pass type ${order.pass_type}`.slice(0, 200) });
    return { ok: false, status: "grant_failed", message: "결제는 됐고 패스 지급을 확인하고 있어요. 곧 처리해 드릴게요." };
  }
  const expires = new Date(Date.now() + def.days * 86400000).toISOString();
  const { error } = await db
    .from("passes")
    .upsert({ user_id: order.user_id, pass_type: order.pass_type, order_id: order.id, expires_at: expires, uses_left: null }, { onConflict: "order_id", ignoreDuplicates: true });
  if (error) {
    await setStatus(order.id, "paid", "grant_failed", { failure_reason: error.message.slice(0, 200) });
    return { ok: false, status: "grant_failed", message: "결제는 됐고 패스 지급을 확인하고 있어요. 곧 처리해 드릴게요." };
  }
  await setStatus(order.id, "paid", "granted");
  return { ok: true, status: "granted", passType: order.pass_type };
}
