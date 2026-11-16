// 로그인 + 쿼터 확인 (specs/billing BILL-01), shared by server actions that spend AI quota.
// Moved out of app/(main)/postings/actions.ts so the 관리 tab can use it too.
import "server-only";
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/data";
import { aiEnabled } from "@/lib/ai/tasks";
import { canSpend, planFromPasses } from "@/lib/billing/state";
import type { QuotaFeature } from "@/lib/contracts/billing";

/** Signed-in Supabase session + quota check. Returns a message when the request cannot start. */
export async function gate(feature: QuotaFeature, next = "/postings") {
  if (!supabaseEnabled()) return { error: "아직 계정 저장소가 연결되지 않았어요. 지금은 데모 공고로 흐름을 볼 수 있어요." as const };
  if (!aiEnabled()) return { error: "AI 키가 아직 연결되지 않았어요. 지금은 데모 공고로 흐름을 볼 수 있어요." as const };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) redirect(`/auth/login?next=${encodeURIComponent(next)}`); // EX-01
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ count }, { data: passes }] = await Promise.all([
    db.from("quota_usage").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    db.from("passes").select("pass_type, expires_at, uses_left"),
  ]);
  const plan = planFromPasses((passes ?? []).map((p) => ({ type: p.pass_type, expiresAt: p.expires_at, usesLeft: p.uses_left })));
  if (!canSpend(plan, count ?? 0)) return { error: "이번 달 쿼터를 다 썼어요. 패스로 쿼터를 늘릴 수 있어요." as const, quota: true }; // EX-04
  return { db, uid, feature };
}
