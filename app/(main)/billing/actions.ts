"use server";
// 주문 만들기 (specs/billing FR-ACCT-03: created -> pending). Amount comes from the server catalogue, never from the browser.
import { supabaseEnabled } from "@/lib/data";
import { newOrderId } from "@/lib/billing/state";
import { tossEnabled } from "@/lib/billing/confirm";
import { PASS_CATALOG, PassType } from "@/lib/contracts/billing";

export type CheckoutOrder = { orderId: string; amount: number; orderName: string; customerKey: string } | { error: string };

export async function createOrderAction(passTypeRaw: string): Promise<CheckoutOrder> {
  const parsed = PassType.safeParse(passTypeRaw);
  if (!parsed.success) return { error: "패스 종류가 올바르지 않아요." };
  if (!supabaseEnabled() || !tossEnabled()) return { error: "결제(테스트 모드)가 아직 연결되지 않았어요." };
  const { createClient } = await import("@/lib/supabase/server");
  const { data: claims } = await (await createClient()).auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { error: "로그인이 필요해요." };
  const pass = PASS_CATALOG[parsed.data];
  const orderId = newOrderId();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { error } = await createAdminClient().from("orders").insert({ id: orderId, user_id: uid, pass_type: parsed.data, amount: pass.price, status: "pending" });
  if (error) return { error: "주문을 만들지 못했어요." };
  return { orderId, amount: pass.price, orderName: `LetsGraph ${pass.name}`, customerKey: uid };
}

/** fail redirect or closed window: pending -> canceled */
export async function cancelOrderAction(orderId: string): Promise<void> {
  if (!supabaseEnabled()) return;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("orders").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "pending");
}
