import { describe, expect, it } from "vitest";
import { evidenceOf, normalizeEvidence, requirementsOf, toConnectionFields } from "@/lib/connect/evidence";
import { Activity, Experience, type ConnectionOutput } from "@/lib/contracts/activity";
import { DEMO_ANALYSES, DEMO_POSTINGS } from "@/lib/data/fixtures";

const act = (id: string, title: string) => Activity.parse({ id, title, kind: "project", summary: "" });
const ep = (id: string, title: string) => Experience.parse({ id, title, kind: "project", situation: "", action: "", result: "", competencies: [] });
const activities = [act("a1", "CNN 프로젝트")];
const episodes = [ep("e1", "갈등 조율")];
const analysis = DEMO_ANALYSES[DEMO_POSTINGS[0].id];

describe("FR-PREM-02 지원 근거", () => {
  it("lists the conditions in order: competencies, qualifications, preferred, without duplicates", () => {
    const reqs = requirementsOf(analysis);
    expect(reqs.slice(0, 4).every((r) => r.kind === "competency")).toBe(true);
    expect(reqs.filter((r) => r.kind === "qualification")).toHaveLength(analysis.qualifications.length);
    expect(reqs.at(-1)).toEqual({ requirement: analysis.preferred.at(-1), kind: "preferred" });
  });
  it("keeps real cards, turns a missing card into 근거 없음, and fills skipped conditions", () => {
    const reqs = [
      { requirement: "머신러닝", kind: "competency" as const },
      { requirement: "협업", kind: "competency" as const },
      { requirement: "없는 카드", kind: "preferred" as const },
      { requirement: "건너뜀", kind: "qualification" as const },
    ];
    const out = normalizeEvidence(
      {
        evidence: [
          { requirement: "머신러닝", kind: "competency", cardType: "activity", cardId: "a1", strength: "strong", reason: "r", missing: "쓸모없음", next: "쓸모없음" },
          { requirement: "협업", kind: "competency", cardType: "episode", cardId: "e1", strength: "weak", reason: "r", missing: "m", next: "n" },
          { requirement: "없는 카드", kind: "preferred", cardType: "episode", cardId: "zz", strength: "strong", reason: "r", missing: null, next: "n" },
        ],
      },
      reqs,
      episodes,
      activities,
    );
    expect(out.map((e) => [e.requirement, e.cardType, e.cardTitle ?? null, e.strength])).toEqual([
      ["머신러닝", "activity", "CNN 프로젝트", "strong"],
      ["협업", "episode", "갈등 조율", "weak"],
      ["없는 카드", "none", null, "none"],
      ["건너뜀", "none", null, "none"],
    ]);
    expect(out[0].missing).toBeUndefined(); // strong: nothing missing, no next step
    expect(out[0].next).toBeUndefined();
    expect(out[1]).toMatchObject({ missing: "m", next: "n" });
    expect(out[2].reason).toBe("");
  });
  it("derives the competency links, skills and gaps, and reads results made before evidence", () => {
    const fields = toConnectionFields([
      { requirement: "머신러닝", kind: "competency", cardType: "activity", cardId: "a1", cardTitle: "CNN 프로젝트", strength: "strong", reason: "r" },
      { requirement: "협업", kind: "competency", cardType: "episode", cardId: "e1", cardTitle: "갈등 조율", strength: "medium", reason: "r" },
      { requirement: "도전", kind: "competency", cardType: "none", strength: "none", reason: "" },
      { requirement: "자격증", kind: "preferred", cardType: "none", strength: "none", reason: "" },
    ]);
    expect(fields.skills?.map((s) => s.competency)).toEqual(["머신러닝"]);
    expect(fields.links.map((l) => l.experienceId)).toEqual(["e1"]);
    expect(fields.gaps).toEqual(["도전"]); // only 핵심 역량 become gaps
    const old: ConnectionOutput = { links: [{ competency: "협업", experienceTitle: "갈등 조율", reason: "r" }], gaps: ["도전"] };
    expect(evidenceOf(old, null, episodes, activities).map((e) => [e.requirement, e.cardType, e.strength])).toEqual([
      ["협업", "episode", "medium"],
      ["도전", "none", "none"],
    ]);
  });
});
