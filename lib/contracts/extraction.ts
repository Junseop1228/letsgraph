// B1 + B2 (specs/data-pipeline FR-OPS-03, specs/company CORP-05): what the AI returns for one 사업보고서, and the
// checked rows we store. One call per company: 사업 부문별 매출·영업이익·설명 (B1) + 돈의 흐름 + 부문 안의 직무 설명 (B2).
import { z } from "zod";

export const MONEY_UNITS = ["원", "천원", "백만원", "억원"] as const;
export type MoneyUnit = (typeof MONEY_UNITS)[number];

/** 억원 per one reported unit */
export const TO_EOK: Record<MoneyUnit, number> = { 원: 1e-8, 천원: 1e-5, 백만원: 1e-2, 억원: 1 };

const FlowStepAi = z.object({
  key: z.string().describe("단계: 원재료, 주요 제품, 판매 채널, 매출 중 하나"),
  title: z.string().describe("짧은 명사구"),
  detail: z.string().describe("보고서에 근거한 한 문장"),
});

const SegmentAi = z.object({
  name: z.string().describe("보고서에 적힌 부문 이름"),
  shortName: z.string().describe("화면용 짧은 이름, 2~8자"),
  revenue: z.number().nullable().describe("최근 사업연도 매출, unit 단위 숫자, 없으면 null"),
  operatingIncome: z.number().nullable().describe("최근 사업연도 영업이익(손실은 음수), unit 단위, 없으면 null"),
  summary: z.string().describe("무엇을 팔아 돈을 버는지 한 문장"),
  // no item counts in the schema: nested min/max made Gemini refuse it ("too many states", 2026-11-17);
  // counts are in the prompt and clamped in lib/dart/segments.ts
  flow: z.array(FlowStepAi).describe("2~4단계"),
  jobs: z
    .array(z.object({ jobRoleId: z.string(), notes: z.array(z.string()) }))
    .describe("jobs 목록 중 이 부문에서 하는 일이 보고서에 드러나는 직무, 최대 4개, notes는 1~2문장"),
  trend: z
    .array(z.object({ year: z.number(), revenue: z.number().nullable(), operatingIncome: z.number().nullable() }))
    .describe("표에 있는 연도별 부문 실적(최대 3개), 없으면 빈 배열"),
});

export const SegmentExtractionAiOutput = z.object({
  found: z.boolean().describe("사업부문을 찾았는지"),
  unit: z.enum(MONEY_UNITS),
  fiscalYear: z.number(),
  segments: z.array(SegmentAi).describe("최대 6개"),
});
export type SegmentExtractionAiOutput = z.infer<typeof SegmentExtractionAiOutput>;
export type SegmentAi = z.infer<typeof SegmentAi>;
