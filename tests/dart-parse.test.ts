// Scenario names follow specs/data-pipeline/spec.md.
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { DartAccountList, DartCompany } from "@/lib/contracts/dart";
import { annualFromAccounts, dartDate, listedOnly, parseCorpCodeXml, parseWon, unzipCorpCode, wonToEok } from "@/lib/dart/parse";

const row = (account_id: string, account_nm: string, amount: string, sj_div = "IS") => ({
  rcept_no: "20260310000123",
  bsns_year: "2025",
  corp_code: "00000001",
  sj_div,
  account_id,
  account_nm,
  thstrm_amount: amount,
  frmtrm_amount: "",
  bfefrmtrm_amount: "",
  currency: "KRW",
});

describe("FR-OPS-02 공개 데이터 수집", () => {
  it("기업 한 곳 수집: revenue and operating income in 억원 from the income statement", () => {
    const list = DartAccountList.parse({
      status: "000",
      message: "정상",
      list: [
        row("ifrs-full_Assets", "자산총계", "100000000000000", "BS"),
        row("ifrs-full_Revenue", "매출액", "17754900000000"),
        row("dart_OperatingIncomeLoss", "영업이익(손실)", "861200000000"),
      ],
    });
    const fig = annualFromAccounts(list.list, "00000001", 2025, "CFS");
    expect(fig).toEqual({ corpCode: "00000001", year: 2025, fsDiv: "CFS", revenue: 177549, operatingIncome: 8612, rceptNo: "20260310000123" });
  });

  it("falls back to account names and handles losses and blanks", () => {
    const fig = annualFromAccounts(
      [row("x_custom", "영업수익", "1,234,500,000,000", "CIS"), row("y_custom", "영업손익", "-50000000000", "CIS")],
      "00000002",
      2025,
      "OFS",
    );
    expect(fig?.revenue).toBe(12345);
    expect(fig?.operatingIncome).toBe(-500);
    expect(parseWon("-")).toBeNull();
    expect(wonToEok(null)).toBeNull();
  });

  it("형식 검증 실패 (E3): a malformed company payload is rejected", () => {
    expect(DartCompany.safeParse({ status: "000", message: "정상", corp_code: "123", corp_name: "x", corp_cls: "Y" }).success).toBe(false);
    expect(
      DartCompany.safeParse({ status: "000", message: "정상", corp_code: "00126380", corp_name: "삼성전자", corp_cls: "Y", bizr_no: "1248100998", induty_code: "264" }).success,
    ).toBe(true);
  });

  it("parses the corpCode zip and keeps listed companies", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><result>
      <list><corp_code>00126380</corp_code><corp_name>삼성전자</corp_name><stock_code>005930</stock_code><modify_date>20250101</modify_date></list>
      <list><corp_code>00999999</corp_code><corp_name>비상장</corp_name><stock_code> </stock_code><modify_date>20250101</modify_date></list>
      <list><corp_code>bad</corp_code><corp_name>잘못된 행</corp_name></list>
    </result>`;
    const zip = zipSync({ "CORPCODE.xml": strToU8(xml) });
    const { items, skipped } = parseCorpCodeXml(unzipCorpCode(zip));
    expect(items).toHaveLength(2);
    expect(skipped).toBe(1);
    expect(listedOnly(items).map((i) => i.corp_name)).toEqual(["삼성전자"]);
    expect(dartDate("20260209")).toBe("2026-02-09");
  });
});
