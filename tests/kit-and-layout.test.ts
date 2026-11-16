import { describe, expect, it } from "vitest";
import { buildPromptKit, kitToMarkdown, kitToText } from "@/lib/kit/build";
import { DEMO_ANALYSES, DEMO_CONNECTIONS, DEMO_EXPERIENCES, DEMO_POSTINGS, SEGMENTS, SEGMENT_DETAILS } from "@/lib/data/fixtures";
import { ConnectionOutput, PostingAnalysisOutput } from "@/lib/contracts/activity";

describe("FR-PREM-03 Prompt Kit 만들기", () => {
  const posting = DEMO_POSTINGS[0];
  const kit = buildPromptKit({
    posting,
    analysis: DEMO_ANALYSES[posting.id],
    segment: SEGMENTS.find((s) => s.id === posting.segmentId),
    segmentDetail: SEGMENT_DETAILS.find((d) => d.segmentId === posting.segmentId),
    connection: DEMO_CONNECTIONS[posting.id],
    experiences: DEMO_EXPERIENCES,
    now: new Date("2026-11-14T00:00:00Z"),
  });
  it("contains the posting, segment context, one episode per link and the gaps", () => {
    const text = kitToText(kit);
    expect(text).toContain('<공고 출처="데모용 예시 공고">');
    expect(text).toContain("매출 11조 5,221억 원");
    expect(text).toContain("영업이익 5,255억 원 (전년 대비 ▼ −15.3%)");
    expect(kit.sections.filter((s) => s.id.startsWith("ep-"))).toHaveLength(3);
    expect(text).toContain("도전: 연결된 경험이 없음");
    expect(kitToMarkdown(kit).startsWith("# CJ제일제당 품질관리 신입 Prompt Kit")).toBe(true);
  });
  it("demo AI outputs satisfy their contracts", () => {
    for (const a of Object.values(DEMO_ANALYSES)) expect(PostingAnalysisOutput.safeParse(a).success).toBe(true);
    for (const c of Object.values(DEMO_CONNECTIONS)) expect(ConnectionOutput.safeParse(c).success).toBe(true);
  });
});
