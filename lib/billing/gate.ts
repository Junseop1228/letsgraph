// 로그인 + 이용 권한 확인 (specs/billing BILL-01), shared by the server actions that use AI or save cards.
// Visitors are sent to log in. Free users: 공고 등록 without limit, a few saved activities and episodes in total, no 연결.
// The season pass removes every limit. Returns a message (with pay: true when a pass would help) when the request cannot start.
import "server-only";
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/data";
import { aiEnabled } from "@/lib/ai/tasks";
import { access, isLimited, planFromPasses, type GatedFeature, type Plan } from "@/lib/billing/state";

type Gate =
  | { error: string; pay?: true }
  | { db: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>; uid: string; feature: GatedFeature; plan: Plan; remaining: number | null };

/**
 * @param next where to come back after logging in
 * @param needsAi false for plain saves (no AI call), so they work without an AI key
 */
export async function gate(feature: GatedFeature, next = "/postings", needsAi = true): Promise<Gate> {
  if (!supabaseEnabled()) return { error: "아직 계정 저장소가 연결되지 않았어요. 지금은 데모 공고로 흐름을 볼 수 있어요." };
  if (needsAi && !aiEnabled()) return { error: "AI 키가 아직 연결되지 않았어요. 지금은 데모 공고로 흐름을 볼 수 있어요." };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) redirect(`/auth/login?next=${encodeURIComponent(next)}`); // EX-01: log in first
  const [{ data: passes }, used] = await Promise.all([
    db.from("passes").select("pass_type, expires_at"),
    isLimited(feature) ? db.from("quota_usage").select("id", { count: "exact", head: true }).eq("feature", feature).then((r) => r.count ?? 0) : Promise.resolve(0),
  ]);
  const plan = planFromPasses((passes ?? []).map((p) => ({ type: String(p.pass_type), expiresAt: p.expires_at as string | null })));
  const a = access(plan, feature, used);
  if (!a.ok) return { error: a.message, pay: true }; // EX-04 / EX-05: offer the season pass
  return { db, uid, feature, plan, remaining: a.remaining };
}

/** Records uses of a limited feature (one row each). Failed AI runs are never recorded (EX-03). */
export async function recordUse(db: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>, uid: string, feature: GatedFeature, times = 1) {
  if (times <= 0) return;
  await db.from("quota_usage").insert(Array.from({ length: times }, () => ({ user_id: uid, feature })));
}
