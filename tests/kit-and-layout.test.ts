import { describe, expect, it } from "vitest";
import { buildPromptKit, kitToMarkdown, kitToText } from "@/lib/kit/build";
import { DEMO_ANALYSES, DEMO_CONNECTIONS, DEMO_EXPERIENCES, DEMO_POSTINGS, SEGMENTS, SEGMENT_DETAILS, COMPANIES, JOB_LINKS } from "@/lib/data/fixtures";
import { branchPositions, layoutCompanies, MAP, nodeSize } from "@/lib/explore/layout";
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

describe("FR-MAP-03 직무 맵 layout", () => {
  const links = JOB_LINKS.filter((l) => l.jobRoleId === "quality");
  const { nodes, wedges } = layoutCompanies(COMPANIES, links, ["food", "bio-pharma", "cosmetics"]);
  it("places every linked company once, posting links on the inner orbit", () => {
    expect(nodes).toHaveLength(links.length);
    for (const n of nodes) {
      const r = Math.hypot(n.x - MAP.cx, n.y - MAP.cy);
      const basis = links.find((l) => l.companyId === n.id)!.basis;
      expect(Math.round(r)).toBe(basis === "posting" ? MAP.rInner : MAP.rOuter);
    }
    expect(wedges.map((w) => w.industryId)).toEqual(["food", "bio-pharma", "cosmetics"]);
  });
  it("sizes nodes by revenue and keeps branches on the canvas", () => {
    expect(nodeSize(177549, 177549)).toBe(MAP.maxSize);
    expect(nodeSize(null, 177549)).toBe(MAP.minSize);
    const cj = nodes.find((n) => n.id === "cj")!;
    for (const b of branchPositions(cj, 3)) {
      expect(b.x).toBeGreaterThanOrEqual(70);
      expect(b.x).toBeLessThanOrEqual(MAP.w - 70);
      expect(b.y).toBeGreaterThanOrEqual(30);
      expect(b.y).toBeLessThanOrEqual(MAP.h - 30);
    }
  });
});
