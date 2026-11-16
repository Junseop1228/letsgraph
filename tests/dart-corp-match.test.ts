import { describe, expect, it } from "vitest";
import { findCorpCode, normalizeCorpName } from "@/lib/dart/parse";
import type { DartCorpCode } from "@/lib/contracts/dart";

const item = (corp_code: string, corp_name: string, stock_code = ""): DartCorpCode => ({ corp_code, corp_name, stock_code, modify_date: "20260101" });

const ITEMS = [
  item("00635134", "CJ제일제당", "097950"),
  item("00999999", "CJ제일제당", ""), // unlisted namesake
  item("00126380", "삼성전자", "005930"),
  item("00111111", "대상", "001680"),
  item("00222222", "대상홀딩스", "084690"),
  item("00333333", "한빛상사", ""),
  item("00444444", "한빛상사", ""),
];

describe("FR-OPS-02 기업 한 곳 수집: DART 고유번호 찾기", () => {
  it("normalises (주), 주식회사 and spaces", () => {
    expect(normalizeCorpName("(주) CJ 제일제당")).toBe("cj제일제당");
    expect(normalizeCorpName("주식회사 삼성전자")).toBe("삼성전자");
  });
  it("matches an exact name and prefers the listed company over an unlisted namesake", () => {
    const m = findCorpCode(ITEMS, "CJ제일제당");
    expect(m.ok && m.item.corp_code).toBe("00635134");
    const s = findCorpCode(ITEMS, "주식회사 삼성전자");
    expect(s.ok && s.item.corp_code).toBe("00126380");
  });
  it("does not match a different company that only starts with the same name", () => {
    const m = findCorpCode(ITEMS, "대상");
    expect(m.ok && m.item.corp_code).toBe("00111111");
  });
  it("refuses unknown and ambiguous names instead of guessing", () => {
    expect(findCorpCode(ITEMS, "없는회사").ok).toBe(false);
    const amb = findCorpCode(ITEMS, "한빛상사");
    expect(amb.ok).toBe(false);
    if (!amb.ok) expect(amb.reason).toContain("2곳");
  });
});
