// Plan and free limits for the signed-in user (specs/billing FR-ACCT-04, BILL-01). Server only.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { freeRemaining, planFromPasses, type LimitedFeature, type Plan } from "@/lib/billing/state";

export type PlanState = {
  plan: Plan;
  /** saved activities / episodes counted against the free limits (all time) */
  used: Record<LimitedFeature, number>;
  /** what is left of each free limit; null with the season pass (no limit) */
  remaining: Record<LimitedFeature, number | null>;
  passes: { type: string; expiresAt: string | null }[];
};

export async function currentPlan(db: SupabaseClient, now: Date = new Date()): Promise<PlanState> {
  const count = (feature: LimitedFeature) =>
    db.from("quota_usage").select("id", { count: "exact", head: true }).eq("feature", feature).then((r) => r.count ?? 0);
  const [activity, episode, { data }] = await Promise.all([count("activity_save"), count("episode_save"), db.from("passes").select("pass_type, expires_at")]);
  const passes = (data ?? []).map((p) => ({ type: String(p.pass_type), expiresAt: p.expires_at as string | null }));
  const plan = planFromPasses(passes, now);
  const used = { activity_save: activity, episode_save: episode };
  const left = (f: LimitedFeature) => (plan === "premium" ? null : freeRemaining(f, used[f]));
  return { plan, used, remaining: { activity_save: left("activity_save"), episode_save: left("episode_save") }, passes };
}
