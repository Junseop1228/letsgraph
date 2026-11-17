// Scenario names follow specs/company/spec.md (FR-CORP-02 소식 보기: 공시).
import { describe, expect, it } from "vitest";
import { cleanTitle, dartViewerUrl, isNoise, pickFilings, toUpdateRows } from "@/lib/dart/updates";
import type { DartFiling } from "@/lib/contracts/dart";

const f = (rcept_no: string, report_nm: string): DartFiling => ({
  corp_code: "00000001",
  corp_name: "가상전자",
  stock_code: "",
  corp_cls: "Y",
  report_nm,
  rcept_no,
  flr_nm: "",
  rcept_dt: rcept_no.slice(0, 8),
  rm: "",
});

describe("FR-CORP-02 소식 보기: 공시", () => {
  it("지분·지배구조 같은 일상 공시는 뺀다", () => {
    expect(isNoise("임원ㆍ주요주주특정증권등소유상황보고서")).toBe(true);
    expect(isNoise("현금ㆍ현물배당을위한주주명부폐쇄(기준일)결정")).toBe(true);
    expect(isNoise("단일판매ㆍ공급계약체결")).toBe(false);
  });

  it("정정 표시는 뒤로 빼고, 같은 제목은 최신 하나만, 최신순으로 최대 개수까지", () => {
    expect(cleanTitle("[기재정정]단일판매ㆍ공급계약체결")).toBe("단일판매·공급계약체결 (정정)");
    const picked = pickFilings(
      [
        f("20261001000001", "단일판매ㆍ공급계약체결"),
        f("20261020000002", "[기재정정]단일판매ㆍ공급계약체결"),
        f("20261110000003", "기업설명회(IR)개최(안내공시)"),
        f("20261111000004", "임원ㆍ주요주주특정증권등소유상황보고서"),
        f("20260814000005", "반기보고서 (2026.06)"),
      ],
      3,
    );
    expect(picked.map((p) => [p.title, p.date, p.kind])).toEqual([
      ["기업설명회(IR)개최(안내공시)", "2026-11-10", "ir"],
      ["단일판매·공급계약체결 (정정)", "2026-10-20", "disclosure"],
      ["반기보고서 (2026.06)", "2026-08-14", "disclosure"],
    ]);
  });

  it("AI가 고른 사업부만 태그로, 모르는 id나 null은 전사", () => {
    const picked = pickFilings([f("20261020000002", "신규시설투자등"), f("20261001000001", "단일판매ㆍ공급계약체결")]);
    const rows = toUpdateRows("dart-1", picked, [{ id: "dart-1-s1", shortName: "시스템반도체" }], ["dart-1-s1", "nope"]);
    expect(rows.map((r) => [r.tag, r.segment_id, r.rcept_no])).toEqual([
      ["시스템반도체", "dart-1-s1", "20261020000002"],
      ["전사", null, "20261001000001"],
    ]);
    expect(dartViewerUrl("20261020000002")).toBe("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20261020000002");
  });
});
