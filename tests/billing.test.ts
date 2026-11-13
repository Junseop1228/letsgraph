// Scenario names follow specs/billing/spec.md.
import { describe, expect, it } from "vitest";
import { PaymentStatus, TRANSITIONS, TossSuccessQuery } from "@/lib/contracts/billing";
import { amountMatches, canSpend, newOrderId, planFromPasses, remainingQuota, transition } from "@/lib/billing/state";

describe("FR-ACCT-03 패스 구매", () => {
  it("정상 결제: created -> pending -> confirming -> paid -> granted", () => {
    let s: PaymentStatus = "created";
    for (const e of ["open_checkout", "success_redirect", "confirm_ok", "grant_ok"] as const) {
      const r = transition(s, e);
      expect(r.ok && r.changed).toBe(true);
      s = r.status;
    }
    expect(s).toBe("granted");
  });

  it("결제 취소·실패 (E1): pending -> canceled, and no further grant", () => {
    const r = transition("pending", "cancel");
    expect(r).toEqual({ ok: true, changed: true, status: "canceled" });
    expect(transition("canceled", "grant_ok").ok).toBe(false);
  });

  it("금액 위조: mismatch fails the order and the confirm API is not called", () => {
    expect(amountMatches(9900, 990)).toBe(false);
    expect(amountMatches(9900, 9900)).toBe(true);
    expect(amountMatches(9900, 9900.5)).toBe(false);
    expect(transition("pending", "amount_mismatch").status).toBe("failed");
  });

  it("같은 주문을 두 번 승인 시도: replayed redirect changes nothing", () => {
    for (const s of ["confirming", "paid", "granted"] as const) {
      expect(transition(s, "success_redirect")).toEqual({ ok: true, changed: false, status: s });
    }
  });

  it("결제는 됐는데 부여 실패 (E2): paid -> grant_failed -> operator grant", () => {
    expect(transition("paid", "grant_fail").status).toBe("grant_failed");
    expect(transition("grant_failed", "operator_grant").status).toBe("granted");
  });

  it("every state in the table is a known status", () => {
    for (const [from, edges] of Object.entries(TRANSITIONS)) {
      expect(PaymentStatus.safeParse(from).success).toBe(true);
      for (const to of Object.values(edges)) expect(PaymentStatus.safeParse(to).success).toBe(true);
    }
  });

  it("order ids satisfy the Toss format", () => {
    const id = newOrderId(new Date("2026-11-14T01:00:00Z"), () => 0.5);
    expect(id).toMatch(/^[A-Za-z0-9_-]{6,64}$/);
    expect(TossSuccessQuery.safeParse({ paymentKey: "pk", orderId: id, amount: "9900" }).success).toBe(true);
  });
});

describe("BILL-01 쿼터 차감", () => {
  it("쿼터 소진 (EX-04): free users stop at the monthly limit", () => {
    expect(remainingQuota("free", 0)).toBe(3);
    expect(canSpend("free", 2)).toBe(true);
    expect(canSpend("free", 3)).toBe(false);
    expect(remainingQuota("free", 10)).toBe(0);
  });

  it("premium comes from an active season pass or an unused single pass", () => {
    const now = new Date("2026-11-14T00:00:00Z");
    expect(planFromPasses([], now)).toBe("free");
    expect(planFromPasses([{ type: "season", expiresAt: "2026-12-01T00:00:00Z" }], now)).toBe("premium");
    expect(planFromPasses([{ type: "season", expiresAt: "2026-11-01T00:00:00Z" }], now)).toBe("free");
    expect(planFromPasses([{ type: "single", usesLeft: 1 }], now)).toBe("premium");
    expect(planFromPasses([{ type: "single", usesLeft: 0 }], now)).toBe("free");
  });
});
