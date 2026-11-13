// OpenDART response contracts (specs/data-pipeline). Only the fields we use are required; the rest pass through.
// API guide: https://opendart.fss.or.kr/guide/main.do
import { z } from "zod";

export const DART_BASE = "https://opendart.fss.or.kr/api";

/**
 * Daily request limit per key. OPEN (NFR-EXT-07): confirm the official figure on opendart.fss.or.kr and
 * update this constant. The collector stops at 90% of it (specs/data-pipeline E2).
 */
export const DART_DAILY_LIMIT = 20000;
export const DART_STOP_RATIO = 0.9;

/** Report codes (reprt_code) */
export const REPRT_ANNUAL = "11011"; // 사업보고서

/** status codes that mean "retry later" vs "do not retry" */
export const DART_STATUS = {
  ok: "000",
  noData: "013",
  rateLimited: "020",
  maintenance: "800",
} as const;
export const DART_RETRYABLE = new Set(["020", "800", "900"]);

const Status = z.object({ status: z.string(), message: z.string() });

/** company.json — 기업개황 */
export const DartCompany = Status.extend({
  corp_code: z.string().regex(/^\d{8}$/),
  corp_name: z.string(),
  stock_code: z.string().optional().default(""),
  corp_cls: z.string(), // Y 유가, K 코스닥, N 코넥스, E 기타
  bizr_no: z.string().optional().default(""), // 사업자등록번호 (joins postings)
  induty_code: z.string().optional().default(""), // 업종 코드 (KSIC)
  est_dt: z.string().optional().default(""),
  acc_mt: z.string().optional().default(""), // 결산월
  hm_url: z.string().optional().default(""),
});
export type DartCompany = z.infer<typeof DartCompany>;

/** list.json — 공시검색 */
export const DartFiling = z.object({
  corp_code: z.string(),
  corp_name: z.string(),
  stock_code: z.string().optional().default(""),
  corp_cls: z.string().optional().default(""),
  report_nm: z.string(),
  rcept_no: z.string().regex(/^\d{14}$/),
  flr_nm: z.string().optional().default(""),
  rcept_dt: z.string().regex(/^\d{8}$/),
  rm: z.string().optional().default(""),
});
export const DartFilingList = Status.extend({
  page_no: z.coerce.number().optional(),
  total_count: z.coerce.number().optional(),
  total_page: z.coerce.number().optional(),
  list: z.array(DartFiling).optional().default([]),
});
export type DartFiling = z.infer<typeof DartFiling>;

/** fnlttSinglAcntAll.json — 단일회사 전체 재무제표 */
export const DartAccountRow = z.object({
  rcept_no: z.string(),
  bsns_year: z.string(),
  corp_code: z.string(),
  sj_div: z.string(), // BS, IS, CIS, CF, SCE
  account_id: z.string(),
  account_nm: z.string(),
  thstrm_amount: z.string().optional().default(""),
  frmtrm_amount: z.string().optional().default(""),
  bfefrmtrm_amount: z.string().optional().default(""),
  currency: z.string().optional().default("KRW"),
});
export const DartAccountList = Status.extend({ list: z.array(DartAccountRow).optional().default([]) });
export type DartAccountRow = z.infer<typeof DartAccountRow>;

/** CORPCODE.xml <list> entry (inside corpCode.xml zip) */
export const DartCorpCode = z.object({
  corp_code: z.string().regex(/^\d{8}$/),
  corp_name: z.string(),
  stock_code: z.string().default(""),
  modify_date: z.string().default(""),
});
export type DartCorpCode = z.infer<typeof DartCorpCode>;

/** Normalised annual figures we store per company and fiscal year (억원). */
export const AnnualFigures = z.object({
  corpCode: z.string(),
  year: z.number().int(),
  fsDiv: z.enum(["CFS", "OFS"]), // 연결 / 별도 (NFR-DOM-01)
  revenue: z.number().int().nullable(),
  operatingIncome: z.number().int().nullable(),
  rceptNo: z.string(),
});
export type AnnualFigures = z.infer<typeof AnnualFigures>;
