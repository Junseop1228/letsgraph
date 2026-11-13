// Plan and quota for the signed-in user (specs/billing FR-ACCT-04, BILL-01). Server only.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { monthlyQuota, planFromPasses, remainingQuota, type Plan } from "@/lib/billing/state";

export type PlanState = {
  plan: Plan;
  used: number;
  quota: number;
  remaining: number;
  passes: { type: "season" | "single"; expiresAt: string | null; usesLeft: number | null }[];
};

export function monthStartUtc(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function currentPlan(db: SupabaseClient, now: Date = new Date()): Promise<PlanState> {
  const [{ count }, { data }] = await Promise.all([
    db.from("quota_usage").select("id", { count: "exact", head: true }).gte("created_at", monthStartUtc(now)),
    db.from("passes").select("pass_type, expires_at, uses_left"),
  ]);
  const passes = (data ?? []).map((p) => ({ type: p.pass_type as "season" | "single", expiresAt: p.expires_at as string | null, usesLeft: p.uses_left as number | null }));
  const plan = planFromPasses(passes, now);
  const used = count ?? 0;
  return { plan, used, quota: monthlyQuota(plan), remaining: remainingQuota(plan, used), passes };
}
