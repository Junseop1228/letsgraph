// Domain contracts shared by the UI, the data layer and the DB (see specs/explore, specs/company).
// Names follow the glossary pairs (KO name + EN identifier). Money is in 억원 (integer).
import { z } from "zod";

/** Where a number or sentence comes from (근거 라벨 TrustLabel). */
export const Provenance = z.object({
  kind: z.enum(["filing", "ir", "calculated", "estimate", "ai"]),
  label: z.string(), // e.g. "2025 영업(잠정)실적 공시"
  date: z.string().optional(), // ISO date of the source (기준 시점)
});
export type Provenance = z.infer<typeof Provenance>;

/** 직무 JobRole */
export const JobRole = z.object({
  id: z.string(),
  name: z.string(),
  groupId: z.string(),
  description: z.string(),
});
export type JobRole = z.infer<typeof JobRole>;

/** 직군 JobFamily (group in the job tree) */
export const JobFamily = z.object({ id: z.string(), name: z.string() });
export type JobFamily = z.infer<typeof JobFamily>;

/** 산업 Industry */
export const Industry = z.object({ id: z.string(), name: z.string() });
export type Industry = z.infer<typeof Industry>;

/** 기업 Company (one row per DART filer) */
export const Company = z.object({
  id: z.string(),
  corpCode: z.string().regex(/^\d{8}$/).optional(), // DART 고유번호
  name: z.string(),
  industryId: z.string(),
  revenue: z.number().int().nullable(), // latest fiscal year, 억원
  operatingIncome: z.number().int().nullable(),
  fiscalYear: z.number().int().nullable(),
  revenueGrowth: z.number().nullable().optional(), // 3-year average yearly revenue growth, 0.15 = +15% (D 2026-11-17 step 5b)
  basisNote: z.string().optional(), // "대한통운 제외", "연결"
  source: Provenance.optional(),
  hasDetail: z.boolean().default(false),
});
export type Company = z.infer<typeof Company>;

/** 직무-기업 연결: posting = a real posting exists, estimated = inferred link */
export const JobLink = z.object({
  jobRoleId: z.string(),
  companyId: z.string(),
  basis: z.enum(["posting", "estimated"]),
});
export type JobLink = z.infer<typeof JobLink>;

/** 사업 부문 BusinessSegment (사업부) */
export const BusinessSegment = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  shortName: z.string(),
  revenue: z.number().int().nullable(),
  operatingIncome: z.number().int().nullable(),
  calculated: z.boolean().default(false), // derived by subtraction, not disclosed directly
  summary: z.string(), // one sentence: how this segment makes money
  jobRoleIds: z.array(z.string()),
  /** made by the B1/B2 extraction from a 사업보고서 (shown with an AI label); hand-made demo rows = false */
  aiGenerated: z.boolean().optional(),
});
export type BusinessSegment = z.infer<typeof BusinessSegment>;

/** One fiscal year of a company or segment */
export const FinancialPoint = z.object({
  year: z.number().int(),
  revenue: z.number().int(),
  operatingIncome: z.number().int(),
  /** reported YoY change (%) when the company restated the prior year; overrides the computed one */
  revenueChangeReported: z.number().optional(),
  operatingIncomeChangeReported: z.number().optional(),
});
export type FinancialPoint = z.infer<typeof FinancialPoint>;

export const FlowStep = z.object({
  key: z.string(), // 원재료 / 주요 제품 / 판매 채널 / 매출
  title: z.string(),
  detail: z.string(),
  figure: z.number().int().optional(),
});
export type FlowStep = z.infer<typeof FlowStep>;

/** 소식 CompanyUpdate (disclosure, IR, or an outbound news search link; never an article body) */
export const CompanyUpdate = z.object({
  tag: z.string(), // segment short name or "전사"
  title: z.string(),
  date: z.string(),
  kind: z.enum(["disclosure", "ir", "release"]),
  sourceLabel: z.string(),
});
export type CompanyUpdate = z.infer<typeof CompanyUpdate>;

export const SegmentDetail = z.object({
  segmentId: z.string(),
  flow: z.array(FlowStep),
  flowSource: Provenance,
  trend: z.array(FinancialPoint),
  trendSource: Provenance,
  jobNotes: z.record(z.string(), z.array(z.string())),
  examplePostingId: z.string().optional(),
  updates: z.array(CompanyUpdate),
  newsQuery: z.string(),
});
export type SegmentDetail = z.infer<typeof SegmentDetail>;

export const CompanyDetail = z.object({
  companyId: z.string(),
  trend: z.array(FinancialPoint),
  trendSource: Provenance,
  updates: z.array(CompanyUpdate),
  newsQuery: z.string(),
});
export type CompanyDetail = z.infer<typeof CompanyDetail>;
