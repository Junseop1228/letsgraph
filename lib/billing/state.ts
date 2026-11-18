// Pure payment state machine and quota rules (specs/billing). No I/O here, so it is unit-tested directly.
import {
  DAILY_AI_LIMITS,
  FREE_LIMITS,
  POSTING_DAILY_LIMIT,
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
export type LimitedFeature = keyof typeof FREE_LIMITS;
/** The features that need a check before they start. */
export type GatedFeature = "posting_analysis" | LimitedFeature | "connection";
export type Access = { ok: true; remaining: number | null } | { ok: false; reason: "pass" | "limit"; message: string };

export const isLimited = (f: GatedFeature): f is LimitedFeature => f in FREE_LIMITS;

/** What is left of a free limit; never negative. */
export function freeRemaining(f: LimitedFeature, usedEver: number): number {
  return Math.max(0, FREE_LIMITS[f] - Math.max(0, usedEver));
}

const LIMIT_MESSAGE: Record<LimitedFeature, string> = {
  activity_save: `무료로 저장할 수 있는 활동 ${FREE_LIMITS.activity_save}개를 다 썼어요. 패스가 있으면 무제한으로 저장할 수 있어요.`,
  episode_save: `무료로 저장할 수 있는 에피소드 ${FREE_LIMITS.episode_save}개를 다 썼어요. 패스가 있으면 무제한으로 꺼낼 수 있어요.`,
};

/**
 * Who may do what (specs/billing BILL-01, 2026-11-18). Signed-in only (the caller sends visitors to log in).
 * Season pass: everything, no limits. Free: 공고 등록 without limit, a few saved activities and episodes in total,
 * no 연결 / 프롬프트 키트. `remaining` is null when there is no limit.
 */
export function access(plan: Plan, feature: GatedFeature, usedEver = 0): Access {
  if (plan === "premium" || feature === "posting_analysis") return { ok: true, remaining: null };
  if (feature === "connection") return { ok: false, reason: "pass", message: "연결 결과와 프롬프트 키트는 패스가 있으면 쓸 수 있어요." };
  const remaining = freeRemaining(feature, usedEver);
  return remaining > 0 ? { ok: true, remaining } : { ok: false, reason: "limit", message: LIMIT_MESSAGE[feature] };
}

const PASSES = new Set(["month", "season"]);

/** Plan from passes: an active 30일 or 시즌 패스 makes the user premium. The old single pass counts for nothing. */
export function planFromPasses(passes: { type: string; expiresAt?: string | null }[], now: Date = new Date()): Plan {
  return passes.some((p) => PASSES.has(p.type) && !!p.expiresAt && new Date(p.expiresAt) > now) ? "premium" : "free";
}

/** 공고 등록 하루 상한 (BM 제안서): one more posting today? The same for free users and pass holders. */
export function postingDaily(usedToday: number): { ok: true; left: number } | { ok: false; message: string } {
  const left = Math.max(0, POSTING_DAILY_LIMIT - Math.max(0, usedToday));
  return left > 0 ? { ok: true, left } : { ok: false, message: `오늘은 공고를 ${POSTING_DAILY_LIMIT}건 정리했어요. 내일 다시 넣을 수 있어요.` };
}

/** Start of today in Korean time (UTC+9, no daylight saving), as an ISO timestamp in UTC. */
export function seoulDayStart(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600_000).toISOString();
}

/** 하루 AI 상한 (SAFE-04): may one more AI call start today? A free user who hits it is offered the pass. */
export function dailyAccess(plan: Plan, usedToday: number): { ok: true; left: number } | { ok: false; message: string; pay: boolean } {
  const left = Math.max(0, DAILY_AI_LIMITS[plan] - Math.max(0, usedToday));
  if (left > 0) return { ok: true, left };
  return plan === "free"
    ? { ok: false, pay: true, message: `오늘은 AI 코치를 많이 썼어요. 내일 다시 이어 갈 수 있어요. 패스가 있으면 하루 ${DAILY_AI_LIMITS.premium}번까지 쓸 수 있어요.` }
    : { ok: false, pay: false, message: "오늘은 AI 코치를 많이 썼어요. 내일 다시 이어 갈 수 있어요." };
}
