// Billing contracts (specs/billing/spec.md). The PaymentStatus values and transitions here are the
// single source for the state table in the spec and for the DB check constraint.
import { z } from "zod";

export const PassType = z.enum(["season", "single"]);
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
export const PASS_CATALOG: Record<PassType, { name: string; price: number; days?: number; uses?: number; includes: string[] }> = {
  season: { name: "시즌 패스", price: 9900, days: 30, includes: ["연결 결과 전체", "프롬프트 키트 무제한"] },
  single: { name: "건당 패스", price: 1900, uses: 1, includes: ["공고 1건의 연결 결과", "프롬프트 키트 1회"] },
};

/** PROPOSED placeholder: free monthly quota for LLM-cost features. */
export const FREE_MONTHLY_QUOTA = 3;
/** PROPOSED placeholder: season-pass monthly quota. */
export const SEASON_MONTHLY_QUOTA = 30;

export const QuotaFeature = z.enum(["posting_analysis", "experience_extraction", "connection", "prompt_kit"]);
export type QuotaFeature = z.infer<typeof QuotaFeature>;

/** Toss Payments success redirect query (successUrl?paymentKey=&orderId=&amount=) */
export const TossSuccessQuery = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(6).max(64),
  amount: z.coerce.number().int().positive(),
});
export type TossSuccessQuery = z.infer<typeof TossSuccessQuery>;
