// 지원 근거 (specs/connection FR-PREM-02): the posting's conditions, the AI's recommendations trimmed to real cards, the
// old competency fields derived from them, and older results read as evidence. Pure, unit-tested.
import type { z } from "zod";
import type {
  Activity,
  ConnectionOutput,
  EvidenceAiOutput,
  EvidencePoint,
  EvidenceStrength,
  Experience,
  PostingAnalysisOutput,
  RequirementKind,
} from "@/lib/contracts/activity";
import { findEpisode } from "@/lib/kit/plan";

export type Requirement = { requirement: string; kind: RequirementKind };

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const cut = (s: string | null | undefined, n: number) => {
  const t = norm(s ?? "");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** The conditions of a posting, in reading order: 핵심 역량, then 자격 요건, then 우대 사항. */
export function requirementsOf(a: PostingAnalysisOutput): Requirement[] {
  const seen = new Set<string>();
  const out: Requirement[] = [];
  const push = (requirement: string, kind: RequirementKind) => {
    const r = cut(requirement, 200);
    if (r && !seen.has(r)) {
      seen.add(r);
      out.push({ requirement: r, kind });
    }
  };
  a.competencies.forEach((c) => push(c.name, "competency"));
  a.qualifications.forEach((q) => push(q, "qualification"));
  a.preferred.forEach((p) => push(p, "preferred"));
  return out.slice(0, 24);
}

/**
 * The AI's recommendations -> one evidence point per condition, in order. A card that does not exist becomes "근거 없음";
 * "근거 없음" never carries a card; texts are trimmed; a condition the AI skipped is "근거 없음" too.
 */
export function normalizeEvidence(raw: z.infer<typeof EvidenceAiOutput>, reqs: Requirement[], episodes: Experience[], activities: Activity[]): EvidencePoint[] {
  return reqs.map((r) => {
    const m = raw.evidence.find((x) => norm(x.requirement) === r.requirement) ?? raw.evidence.find((x) => norm(x.requirement).includes(r.requirement) || r.requirement.includes(norm(x.requirement)));
    const activity = m?.cardType === "activity" ? activities.find((a) => a.id === m.cardId) : undefined;
    const episode = m?.cardType === "episode" ? episodes.find((e) => e.id === m.cardId) : undefined;
    const card = activity ?? episode;
    const strength: EvidenceStrength = !m || !card ? "none" : m.strength === "none" ? "weak" : m.strength;
    return {
      requirement: r.requirement,
      kind: r.kind,
      cardType: activity ? "activity" : episode ? "episode" : "none",
      cardId: card?.id,
      cardTitle: card ? cut(card.title, 80) : undefined,
      strength,
      reason: card ? cut(m?.reason, 300) : "",
      missing: strength !== "strong" && m?.missing ? cut(m.missing, 200) : undefined,
      next: (strength === "weak" || strength === "none") && m?.next ? cut(m.next, 150) : undefined,
    };
  });
}

/** links / skills / gaps for the 핵심 역량, so screens and older code that read them keep working. */
export function toConnectionFields(evidence: EvidencePoint[]): Pick<ConnectionOutput, "links" | "skills" | "gaps"> {
  const comps = evidence.filter((e) => e.kind === "competency");
  return {
    skills: comps.filter((e) => e.cardType === "activity").map((e) => ({ competency: e.requirement, activityId: e.cardId, activityTitle: e.cardTitle ?? "", reason: e.reason || "-" })),
    links: comps.filter((e) => e.cardType === "episode").map((e) => ({ competency: e.requirement, experienceId: e.cardId, experienceTitle: e.cardTitle ?? "", reason: e.reason || "-" })),
    gaps: comps.filter((e) => e.cardType === "none").map((e) => e.requirement).slice(0, 8),
  };
}

/** Evidence for the screens: the stored one, or the 핵심 역량 of a result made before evidence existed. */
export function evidenceOf(c: ConnectionOutput, a: PostingAnalysisOutput | null, episodes: Experience[], activities: Activity[]): EvidencePoint[] {
  if (c.evidence?.length) return c.evidence;
  const names = a?.competencies.map((x) => x.name) ?? [...new Set([...(c.skills ?? []).map((s) => s.competency), ...c.links.map((l) => l.competency), ...c.gaps])];
  return names.map((name): EvidencePoint => {
    const s = (c.skills ?? []).find((x) => x.competency === name);
    const act = s ? activities.find((x) => x.id === s.activityId) ?? activities.find((x) => x.title === s.activityTitle) : undefined;
    if (s && act) return { requirement: name, kind: "competency", cardType: "activity", cardId: act.id, cardTitle: act.title, strength: "medium", reason: s.reason };
    const l = c.links.find((x) => x.competency === name);
    const ep = l ? findEpisode(episodes, l) : null;
    if (l && ep) return { requirement: name, kind: "competency", cardType: "episode", cardId: ep.id, cardTitle: ep.title, strength: "medium", reason: l.reason };
    return { requirement: name, kind: "competency", cardType: "none", strength: "none", reason: "" };
  });
}

export const STRENGTH_LEVEL: Record<EvidenceStrength, number> = { strong: 3, medium: 2, weak: 1, none: 0 };
