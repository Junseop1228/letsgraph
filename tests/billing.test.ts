// Scenario names follow specs/billing/spec.md.
import { describe, expect, it } from "vitest";
import { PaymentStatus, TRANSITIONS, TossSuccessQuery } from "@/lib/contracts/billing";
import { access, amountMatches, dailyAccess, freeRemaining, newOrderId, planFromPasses, seoulDayStart, transition } from "@/lib/billing/state";

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

describe("BILL-01 무료 한도 (2026-11-18)", () => {
  it("공고 등록은 무료도 무제한, 연결·프롬프트 키트는 시즌 패스만", () => {
    expect(access("free", "posting_analysis", 999)).toEqual({ ok: true, remaining: null });
    expect(access("free", "connection")).toMatchObject({ ok: false, reason: "pass" });
    expect(access("premium", "connection")).toEqual({ ok: true, remaining: null });
  });

  it("활동·에피소드 저장은 무료로 각각 평생 3번, 다 쓰면 결제 안내 (EX-04)", () => {
    expect(freeRemaining("activity_save", 0)).toBe(3);
    expect(access("free", "activity_save", 2)).toEqual({ ok: true, remaining: 1 });
    expect(access("free", "activity_save", 3)).toMatchObject({ ok: false, reason: "limit" });
    expect(access("free", "episode_save", 10)).toMatchObject({ ok: false, reason: "limit" });
    expect(freeRemaining("episode_save", 10)).toBe(0);
  });

  it("시즌 패스가 있으면 한도 없음", () => {
    expect(access("premium", "activity_save", 50)).toEqual({ ok: true, remaining: null });
    expect(access("premium", "episode_save", 50)).toEqual({ ok: true, remaining: null });
  });

  it("premium comes from an active season pass only; old single passes count for nothing", () => {
    const now = new Date("2026-11-14T00:00:00Z");
    expect(planFromPasses([], now)).toBe("free");
    expect(planFromPasses([{ type: "season", expiresAt: "2026-12-01T00:00:00Z" }], now)).toBe("premium");
    expect(planFromPasses([{ type: "season", expiresAt: "2026-11-01T00:00:00Z" }], now)).toBe("free");
    expect(planFromPasses([{ type: "single", expiresAt: null }], now)).toBe("free");
  });
});

describe("SAFE-04 하루 AI 상한", () => {
  it("a day starts at midnight Korean time", () => {
    expect(seoulDayStart(new Date("2026-11-18T14:59:00Z"))).toBe("2026-11-17T15:00:00.000Z"); // 23:59 KST on the 18th
    expect(seoulDayStart(new Date("2026-11-18T15:00:00Z"))).toBe("2026-11-18T15:00:00.000Z"); // 00:00 KST on the 19th
  });
  it("free users get 40 calls a day and are offered the pass; pass holders get 200", () => {
    expect(dailyAccess("free", 39)).toEqual({ ok: true, left: 1 });
    expect(dailyAccess("free", 40)).toMatchObject({ ok: false, pay: true });
    expect(dailyAccess("premium", 199)).toEqual({ ok: true, left: 1 });
    expect(dailyAccess("premium", 200)).toMatchObject({ ok: false, pay: false });
  });
});