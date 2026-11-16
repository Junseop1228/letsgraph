// Scenario names follow specs/data-pipeline/spec.md (FR-OPS-02 기업 범위 수집).
import { describe, expect, it } from "vitest";
import { DartMultiAccountList } from "@/lib/contracts/dart";
import { dateWindows, figuresFromMulti, fiscalPeriod, isNonEmployer, latestByCompany } from "@/lib/dart/parse";

const filing = (corp_code: string, rcept_no: string, corp_name = "회사", report_nm = "사업보고서 (2025.12)") => ({
  corp_code,
  corp_name,
  stock_code: "",
  corp_cls: "K",
  report_nm,
  rcept_no,
  flr_nm: corp_name,
  rcept_dt: rcept_no.slice(0, 8),
  rm: "",
});

const multi = (corp_code: string, fs_div: string, account_nm: string, t: string, f: string, b: string) => ({
  rcept_no: "20260310000123",
  bsns_year: "2025",
  corp_code,
  fs_div,
  sj_div: "IS",
  account_nm,
  thstrm_amount: t,
  frmtrm_amount: f,
  bfefrmtrm_amount: b,
});

describe("기업 범위 수집", () => {
  it("보고서 이름에서 사업연도를 읽는다", () => {
    expect(fiscalPeriod("[기재정정]사업보고서 (2025.12)")).toEqual({ year: 2025, month: 12 });
    expect(fiscalPeriod("사업보고서 (2026.03)")).toEqual({ year: 2026, month: 3 });
    expect(fiscalPeriod("사업보고서")).toBeNull();
  });

  it("투자 회사(스팩, 리츠, 선박·인프라 펀드)는 제외한다", () => {
    expect(isNonEmployer("엔에이치스팩29호")).toBe(true);
    expect(isNonEmployer("하나금융40호기업인수목적")).toBe(true);
    expect(isNonEmployer("SK리츠")).toBe(true);
    expect(isNonEmployer("에이자기관리부동산투자회사")).toBe(true);
    expect(isNonEmployer("맥쿼리한국인프라투융자회사")).toBe(true);
    expect(isNonEmployer("CJ제일제당")).toBe(false);
    expect(isNonEmployer("리츠칼튼호텔")).toBe(false);
  });

  it("기업마다 가장 최근 보고서 하나만 남긴다", () => {
    const out = latestByCompany([filing("00000001", "20260310000001"), filing("00000001", "20260402000001"), filing("00000002", "20260311000001")]);
    expect(out).toHaveLength(2);
    expect(out.find((f) => f.corp_code === "00000001")?.rcept_no).toBe("20260402000001");
  });

  it("조회 기간을 3개월 이하로 나눈다", () => {
    const w = dateWindows(new Date(Date.UTC(2025, 10, 18)), new Date(Date.UTC(2026, 10, 17)), 3);
    expect(w[0]).toEqual(["20251118", "20260217"]);
    expect(w.at(-1)?.[1]).toBe("20261117");
    expect(w).toHaveLength(4);
  });

  it("다중회사 주요계정에서 3개 사업연도 x 연결/별도 수치를 만든다 (억원)", () => {
    const list = DartMultiAccountList.parse({
      status: "000",
      message: "정상",
      list: [
        multi("00126380", "CFS", "매출액", "333,605,938,000,000", "300,870,903,000,000", "258,935,494,000,000"),
        multi("00126380", "CFS", "영업이익", "43,601,051,000,000", "32,725,961,000,000", "6,566,976,000,000"),
        multi("00126380", "OFS", "매출액", "238,043,009,000,000", "", ""),
        multi("00999999", "CFS", "매출액", "100,000,000", "", ""),
      ],
    }).list;
    const figs = figuresFromMulti(list, "00126380", 2025);
    expect(figs).toHaveLength(4);
    expect(figs[0]).toMatchObject({ year: 2025, fsDiv: "CFS", revenue: 3336059, operatingIncome: 436011 });
    expect(figs[2]).toMatchObject({ year: 2023, fsDiv: "CFS", revenue: 2589355 });
    expect(figs[3]).toMatchObject({ year: 2025, fsDiv: "OFS", revenue: 2380430, operatingIncome: null });
    expect(figuresFromMulti(list, "00000000", 2025)).toEqual([]);
  });
});
