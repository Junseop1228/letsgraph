// Pure payment state machine and quota rules (specs/billing). No I/O here, so it is unit-tested directly.
import {
  FREE_MONTHLY_QUOTA,
  SEASON_MONTHLY_QUOTA,
  TRANSITIONS,
  type PaymentEvent,
  type PaymentStatus,
} from "@/lib/contracts/billing";

export type TransitionResult =
  | { ok: true; changed: true; status: PaymentStatus }
  | { ok: true; changed: false; status: PaymentStatus } // idempotent replay: nothing to do
  | { ok: false; status: PaymentStatus; error: string };

/** Events that may legitimately arrive again (redirect refresh, retry) and must be ignored, not rejected. */
const REPLAYABLE: Partial<Record<PaymentEvent, PaymentStatus[]>> = {
  success_redirect: ["confirming", "paid", "granted", "grant_failed"],
  confirm_ok: ["paid", "granted", "grant_failed"],
  grant_ok: ["granted"],
  cancel: ["canceled"],
};

export function transition(current: PaymentStatus, event: PaymentEvent): TransitionResult {
  const next = TRANSITIONS[current][event];
  if (next) return { ok: true, changed: true, status: next };
  if (REPLAYABLE[event]?.includes(current)) return { ok: true, changed: false, status: current };
  return { ok: false, status: current, error: `'${event}' is not allowed when the payment is '${current}'` };
}

/** Amount check before calling the Toss confirm API: the redirect amount must equal the stored order amount. */
export function amountMatches(orderAmount: number, redirectAmount: number): boolean {
  return Number.isInteger(redirectAmount) && orderAmount === redirectAmount;
}

/** Order id for Toss: 6-64 chars of [A-Za-z0-9_-]. */
export function newOrderId(now: Date = new Date(), rand: () => number = Math.random): string {
  const ts = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const r = Math.floor(rand() * 36 ** 6).toString(36).padStart(6, "0");
  return `LG-${ts}-${r}`;
}

export type Plan = "free" | "premium";

/** Monthly quota for a plan (LLM-cost features only). */
export function monthlyQuota(plan: Plan): number {
  return plan === "premium" ? SEASON_MONTHLY_QUOTA : FREE_MONTHLY_QUOTA;
}

/** Remaining quota; never negative. */
export function remainingQuota(plan: Plan, usedThisMonth: number): number {
  return Math.max(0, monthlyQuota(plan) - Math.max(0, usedThisMonth));
}

/** Whether a quota-charged request may start (EX-04). Failed AI runs are not counted by the caller (EX-03). */
export function canSpend(plan: Plan, usedThisMonth: number): boolean {
  return remainingQuota(plan, usedThisMonth) > 0;
}

/** Plan from passes: an active season pass or an unused single pass makes the user premium. */
export function planFromPasses(
  passes: { type: "season" | "single"; expiresAt?: string | null; usesLeft?: number | null }[],
  now: Date = new Date(),
): Plan {
  const active = passes.some((p) =>
    p.type === "season" ? !!p.expiresAt && new Date(p.expiresAt) > now : (p.usesLeft ?? 0) > 0,
  );
  return active ? "premium" : "free";
}
