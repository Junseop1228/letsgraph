import { describe, expect, it } from "vitest";
import { applySuggestion, checkSuggestions, MAX_OPEN, openConditions } from "@/lib/connect/suggest";
import type { EvidencePoint } from "@/lib/contracts/activity";

const ev = (requirement: string, strength: EvidencePoint["strength"], kind: EvidencePoint["kind"] = "competency"): EvidencePoint => ({
  requirement,
  kind,
  cardType: strength === "none" ? "none" : "episode",
  cardId: strength === "none" ? undefined : "e-old",
  strength,
  reason: strength === "none" ? "" : "예전 근거",
  missing: strength === "strong" ? undefined : "결과가 없어요",
  next: strength === "none" ? "장면을 꺼내 보세요" : undefined,
});

const conns = [
  { postingId: "p1", posting: "CJ제일제당 · 품질관리", evidence: [ev("문제해결", "strong"), ev("데이터 분석", "weak"), ev("협업", "none")] },
  { postingId: "p2", posting: "오뚜기 · 생산관리", evidence: [ev("주도성", "medium")] },
  { postingId: "p3", posting: "예전 결과", evidence: undefined },
];

describe("FR-PREM-02b 새 카드 맞춤 제안", () => {
  it("offers only conditions not proven strongly, the weakest first", () => {
    const open = openConditions(conns);
    expect(open.map((o) => `${o.key}:${o.current}`)).toEqual(["p1#2:none", "p1#1:weak", "p2#0:medium"]);
    expect(open.length).toBeLessThanOrEqual(MAX_OPEN);
  });

  it("keeps only offered conditions that really get stronger, one each, biggest gain first", () => {
    const open = openConditions(conns);
    const out = checkSuggestions(
      [
        { key: "p1#1", strength: "medium", reason: "공정 데이터를 분석해 원인을 찾았어요." }, // weak -> medium
        { key: "p1#2", strength: "strong", reason: "다른 팀과 기준을 맞췄어요." }, // none -> strong (biggest)
        { key: "p2#0", strength: "medium", reason: "같은 강도라 버림" }, // no gain
        { key: "p1#0", strength: "strong", reason: "제안하지 않은 조건이라 버림" }, // strong already, not offered
        { key: "p9#0", strength: "strong", reason: "없는 공고" },
        { key: "p1#1", strength: "strong", reason: "같은 조건 두 번째는 버림" },
        { key: "p2#0", strength: "strong", reason: "" }, // no reason
      ],
      open,
    );
    expect(out.map((s) => `${s.key}:${s.current}->${s.strength}`)).toEqual(["p1#2:none->strong", "p1#1:weak->medium"]);
  });

  it("replaces the evidence of that one condition only", () => {
    const before = conns[0].evidence!;
    const after = applySuggestion(before, 1, { cardType: "activity", cardId: "a-new", cardTitle: "교내 데이터 분석 공모전", strength: "medium", reason: "공정 데이터를 분석했어요." });
    expect(after[1]).toMatchObject({ cardType: "activity", cardId: "a-new", strength: "medium", reason: "공정 데이터를 분석했어요.", missing: "결과가 없어요", next: undefined });
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(applySuggestion(before, 2, { cardType: "episode", cardId: "e-new", cardTitle: "협업", strength: "strong", reason: "r" })[2].missing).toBeUndefined();
  });
});
