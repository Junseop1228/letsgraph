// Scenario names follow specs/data-pipeline/spec.md (FR-OPS-03 사업 부문 추출 성공 / 추출 실패).
import { describe, expect, it } from "vitest";
import { businessParts, promptText, xmlToText } from "@/lib/dart/document";
import { companyTrend, toSegmentRows } from "@/lib/dart/segments";
import type { SegmentExtractionAiOutput } from "@/lib/contracts/extraction";

const XML = `<DOCUMENT><BODY>
<SECTION-1><TITLE ATOC="Y">I. 회사의 개요</TITLE><P>무시</P></SECTION-1>
<SECTION-1><TITLE ATOC="Y">II. 사업의 내용</TITLE>
<SECTION-2><TITLE ATOC="Y">1. 사업의 개요</TITLE><P>식품과 BIO 두 부문이 있어요 &amp; 물류도.</P>
<TABLE><TR><TD>부문</TD><TD>매출액(백만원)</TD></TR><TR><TD>식품</TD><TD>11,522,251</TD></TR></TABLE></SECTION-2>
<SECTION-2><TITLE ATOC="Y">5. 위험관리 및 파생거래</TITLE><P>환율 위험</P></SECTION-2>
<SECTION-2><TITLE ATOC="Y">2. 주요 제품 및 서비스</TITLE><P>설탕, 밀가루</P></SECTION-2>
</SECTION-1>
<SECTION-1><TITLE ATOC="Y">III. 재무에 관한 사항</TITLE><P>재무</P></SECTION-1>
</BODY></DOCUMENT>`;

describe("FR-OPS-03 사업보고서 원문 읽기", () => {
  it("표는 줄마다 한 행, 칸은 | 로 나눈다", () => {
    expect(xmlToText("<TABLE><TR><TD>부문</TD><TD>매출</TD></TR><TR><TD>식품</TD><TD>1</TD></TR></TABLE>")).toBe("부문 | 매출\n식품 | 1");
  });

  it("II. 사업의 내용만, 번호 붙은 부분으로 나눈다", () => {
    const parts = businessParts(XML);
    expect(parts.map((p) => p.title)).toEqual(["1. 사업의 개요", "5. 위험관리 및 파생거래", "2. 주요 제품 및 서비스"]);
    expect(parts[0].text).toContain("식품과 BIO 두 부문이 있어요 & 물류도.");
    expect(parts[0].text).toContain("식품 | 11,522,251");
    expect(parts.map((p) => p.text).join(" ")).not.toContain("재무");
  });

  it("사업의 내용이 없으면 빈 목록", () => {
    expect(businessParts("<TITLE>I. 회사의 개요</TITLE><P>x</P>")).toEqual([]);
  });

  it("글자 수 한도 안에서 개요·제품·매출 부분을 먼저 넣고, 원래 순서를 지킨다", () => {
    const parts = [
      { title: "5. 위험관리", text: "R".repeat(500) },
      { title: "1. 사업의 개요", text: "A".repeat(300) },
      { title: "2. 주요 제품", text: "B".repeat(300) },
    ];
    const t = promptText(parts, 1000);
    expect(t.indexOf("사업의 개요")).toBeLessThan(t.indexOf("주요 제품"));
    expect(t).toContain("(이하 생략)"); // the risk part did not fit whole
    expect(t.length).toBeLessThanOrEqual(1000 + 20);
    expect(promptText(parts, 10_000)).toMatch(/^## 5\. 위험관리/); // everything fits: original order
  });
});

const seg = (o: Partial<SegmentExtractionAiOutput["segments"][number]> = {}) => ({
  name: "식품 부문",
  shortName: "식품",
  revenue: 11_522_251,
  operatingIncome: 600_000,
  summary: "설탕과 밀가루를 만들어 팔아요.",
  flow: [
    { key: "원재료", title: "원당", detail: "원당을 들여와요." },
    { key: "주요 제품", title: "설탕", detail: "설탕을 만들어요." },
  ],
  jobs: [
    { jobRoleId: "quality", notes: ["원료와 완제품을 검사해요.", "둘째", "셋째"] },
    { jobRoleId: "not-a-job", notes: ["x"] },
  ],
  trend: [
    { year: 2025, revenue: 11_522_251, operatingIncome: 600_000 },
    { year: 2024, revenue: 11_000_000, operatingIncome: null },
  ],
  ...o,
});
const base = { companyId: "dart-1", companyName: "가상식품", rceptNo: "20260316001116", filedOn: "2026-03-16", allowedJobs: ["quality"] };

describe("FR-OPS-03 사업 부문 추출 성공 / 추출 실패", () => {
  it("백만원을 억원으로 바꾸고, 목록에 없는 직무와 빈 칸이 있는 추이는 버린다", () => {
    const r = toSegmentRows({ found: true, unit: "백만원", fiscalYear: 2025, segments: [seg()] }, { ...base, companyRevenue: 115_223 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.segments[0]).toMatchObject({ id: "dart-1-s1", revenue: 115_223, operating_income: 6_000, fiscal_year: 2025, ai_generated: true });
    expect(r.rows.jobs).toEqual([{ segment_id: "dart-1-s1", job_role_id: "quality" }]);
    expect(r.rows.details[0].job_notes).toEqual({ quality: ["원료와 완제품을 검사해요.", "둘째"] });
    expect(r.rows.details[0].trend).toEqual([{ year: 2025, revenue: 115_223, operatingIncome: 6_000 }]);
    expect(r.rows.details[0].flow_source.kind).toBe("ai");
  });

  it("단위가 10의 거듭제곱만큼 틀렸으면 회사 매출에 맞춰 고친다", () => {
    // the AI said 억원 but the table was in 백만원: 100x too big, corrected
    const r = toSegmentRows({ found: true, unit: "억원", fiscalYear: 2025, segments: [seg()] }, { ...base, companyRevenue: 115_223 });
    expect(r.ok && r.rows.segments[0].revenue).toBe(115_223);
  });

  it("부문 합이 회사 매출과 맞지 않으면 저장하지 않는다", () => {
    const r = toSegmentRows({ found: true, unit: "백만원", fiscalYear: 2025, segments: [seg()] }, { ...base, companyRevenue: 40_000 });
    expect(r.ok).toBe(false);
  });

  it("부문이 없으면 실패, 6개가 넘으면 6개만", () => {
    expect(toSegmentRows({ found: false, unit: "원", fiscalYear: 2025, segments: [] }, { ...base, companyRevenue: null }).ok).toBe(false);
    const many = Array.from({ length: 8 }, (_, i) => seg({ name: `부문${i}`, revenue: 1 }));
    const r = toSegmentRows({ found: true, unit: "억원", fiscalYear: 2025, segments: many }, { ...base, companyRevenue: null });
    expect(r.ok && r.rows.segments.length).toBe(6);
  });

  it("기업 추이는 연결 먼저, 없으면 별도", () => {
    const fin = [
      { year: 2025, fs_div: "OFS" as const, revenue: 10, operating_income: 1 },
      { year: 2024, fs_div: "CFS" as const, revenue: 20, operating_income: 2 },
      { year: 2025, fs_div: "CFS" as const, revenue: 30, operating_income: null },
    ];
    expect(companyTrend(fin)).toEqual({ points: [{ year: 2024, revenue: 20, operatingIncome: 2 }], basis: "CFS" });
    expect(companyTrend([fin[0]])).toEqual({ points: [{ year: 2025, revenue: 10, operatingIncome: 1 }], basis: "OFS" });
  });
});
