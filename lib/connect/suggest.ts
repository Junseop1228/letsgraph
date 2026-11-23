// 새 카드 맞춤 제안 (specs/connection FR-PREM-02b): when a card is saved, which open conditions of the user's postings
// (not yet proven strongly) it could prove. Pure parts: the conditions sent to the AI, and the checks on its answer.
// Unit-tested (tests/card-suggestions.test.ts).
import { STRENGTH_LEVEL } from "@/lib/connect/evidence";
import type { EvidencePoint, EvidenceStrength, RequirementKind } from "@/lib/contracts/activity";

export type OpenCondition = {
  /** "<postingId>#<index in evidence>" */
  key: string;
  postingId: string;
  posting: string; // "회사 · 공고명"
  requirement: string;
  kind: RequirementKind;
  current: EvidenceStrength;
};

export type CardSuggestion = OpenCondition & { strength: Exclude<EvidenceStrength, "none">; reason: string };

/** At most this many conditions go to the AI, the weakest first. */
export const MAX_OPEN = 40;
/** At most this many suggestions are shown. */
export const MAX_SUGGESTIONS = 3;

/** Conditions not proven strongly yet, from connections that have per-condition evidence (none and weak first). */
export function openConditions(connections: { postingId: string; posting: string; evidence?: EvidencePoint[] }[]): OpenCondition[] {
  const all: OpenCondition[] = [];
  for (const c of connections)
    (c.evidence ?? []).forEach((e, i) => {
      if (e.strength !== "strong") all.push({ key: `${c.postingId}#${i}`, postingId: c.postingId, posting: c.posting, requirement: e.requirement, kind: e.kind, current: e.strength });
    });
  return all.sort((a, b) => STRENGTH_LEVEL[a.current] - STRENGTH_LEVEL[b.current]).slice(0, MAX_OPEN);
}

/**
 * The AI's answer, checked: only conditions that were offered, only real improvements over the current evidence,
 * one suggestion per condition, the biggest gains first, at most MAX_SUGGESTIONS.
 */
export function checkSuggestions(raw: { key: string; strength: string; reason: string }[], open: OpenCondition[]): CardSuggestion[] {
  const byKey = new Map(open.map((o) => [o.key, o]));
  const seen = new Set<string>();
  const out: CardSuggestion[] = [];
  for (const r of raw) {
    const o = byKey.get(r.key);
    if (!o || seen.has(r.key)) continue;
    if (r.strength !== "strong" && r.strength !== "medium" && r.strength !== "weak") continue;
    if (STRENGTH_LEVEL[r.strength] <= STRENGTH_LEVEL[o.current]) continue;
    const reason = String(r.reason ?? "").trim().slice(0, 300);
    if (!reason) continue;
    seen.add(r.key);
    out.push({ ...o, strength: r.strength, reason });
  }
  return out.sort((a, b) => STRENGTH_LEVEL[b.strength] - STRENGTH_LEVEL[b.current] - (STRENGTH_LEVEL[a.strength] - STRENGTH_LEVEL[a.current])).slice(0, MAX_SUGGESTIONS);
}

/** The evidence of one condition, replaced by the suggested card. The other conditions stay as they are. */
export function applySuggestion(
  evidence: EvidencePoint[],
  index: number,
  s: { cardType: "activity" | "episode"; cardId: string; cardTitle: string; strength: Exclude<EvidenceStrength, "none">; reason: string },
): EvidencePoint[] {
  return evidence.map((e, i) =>
    i === index
      ? { ...e, cardType: s.cardType, cardId: s.cardId, cardTitle: s.cardTitle.slice(0, 80), strength: s.strength, reason: s.reason.slice(0, 300), missing: s.strength === "strong" ? undefined : e.missing, next: undefined }
      : e,
  );
}
