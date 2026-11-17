// Billing contracts (specs/billing/spec.md). The PaymentStatus values and transitions here are the
// single source for the state table in the spec and for the DB check constraint.
import { z } from "zod";

/** Season pass only (2026-11-18: the single pass was dropped). Old 'single' rows may remain in the DB and are ignored. */
export const PassType = z.enum(["season"]);
export type PassType = z.infer<typeof PassType>;

export const PaymentStatus = z.enum([
  "created",
  "pending",
  "confirming",
  "paid",
  "granted",
  "canceled",
  "failed",
  "grant_failed",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PaymentEvent = z.enum([
  "open_checkout", // created -> pending
  "success_redirect", // pending -> confirming (after amount check)
  "amount_mismatch", // pending|confirming -> failed
  "cancel", // pending -> canceled (fail redirect or closed window)
  "confirm_ok", // confirming -> paid
  "confirm_fail", // confirming -> failed
  "grant_ok", // paid -> granted
  "grant_fail", // paid -> grant_failed
  "operator_grant", // grant_failed -> granted
]);
export type PaymentEvent = z.infer<typeof PaymentEvent>;

export const TRANSITIONS: Record<PaymentStatus, Partial<Record<PaymentEvent, PaymentStatus>>> = {
  created: { open_checkout: "pending" },
  pending: { success_redirect: "confirming", amount_mismatch: "failed", cancel: "canceled" },
  confirming: { confirm_ok: "paid", confirm_fail: "failed", amount_mismatch: "failed" },
  paid: { grant_ok: "granted", grant_fail: "grant_failed" },
  granted: {},
  canceled: {},
  failed: {},
  grant_failed: { operator_grant: "granted" },
};

export const TERMINAL: PaymentStatus[] = ["granted", "canceled", "failed"];

/**
 * Pass catalogue.
 * PROPOSED placeholders until the team sets pricing (specs/billing OPEN). Change values here only.
 */
export const PASS_CATALOG: Record<PassType, { name: string; price: number; days: number; includes: string[] }> = {
  season: { name: "시즌 패스", price: 9900, days: 30, includes: ["에피소드·활동 무제한 저장", "연결 결과 전체", "프롬프트 키트 무제한"] },
};

/**
 * 무료 한도 (specs/billing BILL-01, 2026-11-18). A signed-in free user may save this many activities and episodes in
 * total, once (not monthly; deleting does not give them back). 공고 등록 is unlimited; 연결 and the 프롬프트 키트 need
 * the season pass; the pass removes every limit. PROPOSED numbers: change them here only.
 */
export const FREE_LIMITS = { activity_save: 3, episode_save: 3 } as const;

/** What quota_usage records. activity_save / episode_save count the free limits; the others are kept for usage stats. */
export const QuotaFeature = z.enum(["posting_analysis", "experience_extraction", "connection", "prompt_kit", "activity_save", "episode_save"]);
export type QuotaFeature = z.infer<typeof QuotaFeature>;

/** Toss Payments success redirect query (successUrl?paymentKey=&orderId=&amount=) */
export const TossSuccessQuery = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(6).max(64),
  amount: z.coerce.number().int().positive(),
});
export type TossSuccessQuery = z.infer<typeof TossSuccessQuery>;
