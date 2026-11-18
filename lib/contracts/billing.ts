// Billing contracts (specs/billing/spec.md). The PaymentStatus values and transitions here are the
// single source for the state table in the spec and for the DB check constraint.
import { z } from "zod";

/**
 * Passes (BM 제안서 2026-11-18): the 30일 패스 and the 시즌 패스 (90일). One payment, never renewed on its own.
 * Old 'single' rows may remain in the DB and are ignored.
 */
export const PassType = z.enum(["month", "season"]);
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
export const PASS_CATALOG: Record<PassType, { name: string; price: number; days: number; note: string; best?: boolean; includes: string[] }> = {
  month: { name: "30일 패스", price: 9900, days: 30, note: "급할 때 한 달만", includes: ["공고–경험 연결 · 프롬프트 키트 무제한", "경험 카드 저장 무제한", "AI 사용 하루 100회"] },
  season: { name: "시즌 패스", price: 19900, days: 90, note: "공채 한 시즌", best: true, includes: ["30일 패스의 모든 기능", "한 달로 나누면 약 6,600원", "30일 패스 세 번보다 9,800원 저렴"] },
};

/** 환불 (BM 제안서): shown on the pass page and in the user manual. Refunds are processed by the operators. */
export const REFUND_POLICY = [
  "한 번만 결제되고 자동으로 다시 결제되지 않아요.",
  "결제 후 7일 안에 패스 기능을 쓰지 않았다면 전액 환불해요.",
  "그 밖에는 남은 날수만큼 환불해요. 7일이 지나면 10%를 공제해요.",
] as const;

/** 공고 등록 하루 상한 (BM 제안서): postings analysed per person per Korean day, for everyone. */
export const POSTING_DAILY_LIMIT = 30;

/**
 * 무료 한도 (specs/billing BILL-01, 2026-11-18). A signed-in free user may save this many activities and episodes in
 * total, once (not monthly; deleting does not give them back). 공고 등록 is unlimited; 연결 and the 프롬프트 키트 need
 * the season pass; the pass removes every limit. PROPOSED numbers: change them here only.
 */
export const FREE_LIMITS = { activity_save: 3, episode_save: 3 } as const;

/** What quota_usage records. activity_save / episode_save count the free limits; the others are kept for usage stats. */
/**
 * 하루 AI 상한 (specs/safety SAFE-04): AI calls of the 경험 대화 and card making (coach replies, drafts, suggestions,
 * reading a PDF or a repository) per day, Korean time. Keeps a chat without saves from running up the AI bill.
 * PROPOSED numbers: change them here only.
 */
export const DAILY_AI_LIMITS = { free: 40, premium: 100 } as const;

export const QuotaFeature = z.enum(["posting_analysis", "experience_extraction", "connection", "prompt_kit", "activity_save", "episode_save", "ai_call"]);
export type QuotaFeature = z.infer<typeof QuotaFeature>;

/** Toss Payments success redirect query (successUrl?paymentKey=&orderId=&amount=) */
export const TossSuccessQuery = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(6).max(64),
  amount: z.coerce.number().int().positive(),
});
export type TossSuccessQuery = z.infer<typeof TossSuccessQuery>;
