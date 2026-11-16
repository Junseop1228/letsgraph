import { describe, expect, it } from "vitest";
import { competencyKind, normalizeConnection } from "@/lib/connect/normalize";
import { Activity, Experience, type ConnectionOutput } from "@/lib/contracts/activity";

const act = (id: string, title: string) => Activity.parse({ id, title, kind: "project", summary: "" });
const ep = (id: string, title: string) => Experience.parse({ id, title, kind: "project", situation: "", action: "", result: "", competencies: [] });
const activities = [act("a1", "CNN 프로젝트"), act("a2", "카페 아르바이트")];
const episodes = [ep("e1", "데이터 증강"), ep("e2", "팀 갈등 조율")];

describe("FR-PREM-02 전문성은 활동, 행동은 에피소드", () => {
  it("keeps skills on real activities and links on real episodes, filling ids and titles", () => {
    const raw: ConnectionOutput = {
      skills: [
        { competency: "머신러닝", activityId: "a1", activityTitle: "아무 이름", reason: "r" },
        { competency: "원가 관리", activityTitle: "카페 아르바이트", reason: "r" },
        { competency: "없는 활동", activityId: "zz", activityTitle: "없음", reason: "r" },
      ],
      links: [
        { competency: "협업", experienceId: "e2", experienceTitle: "x", reason: "r" },
        { competency: "주도성", experienceTitle: "없는 에피소드", reason: "r" },
      ],
      gaps: [],
    };
    const out = normalizeConnection(raw, episodes, activities, ["머신러닝", "원가 관리", "협업", "주도성", "없는 활동"]);
    expect(out.skills?.map((s) => [s.competency, s.activityId, s.activityTitle])).toEqual([
      ["머신러닝", "a1", "CNN 프로젝트"],
      ["원가 관리", "a2", "카페 아르바이트"],
    ]);
    expect(out.links.map((l) => [l.competency, l.experienceId, l.experienceTitle])).toEqual([["협업", "e2", "팀 갈등 조율"]]);
    expect(out.gaps.sort()).toEqual(["없는 활동", "주도성"]); // dropped matches become gaps
  });
  it("puts each competency in one place only: a proven skill wins over an episode link", () => {
    const raw: ConnectionOutput = {
      skills: [{ competency: "데이터 분석", activityId: "a1", activityTitle: "CNN 프로젝트", reason: "r" }],
      links: [{ competency: "데이터 분석", experienceId: "e1", experienceTitle: "데이터 증강", reason: "r" }],
      gaps: ["데이터 분석"],
    };
    const out = normalizeConnection(raw, episodes, activities);
    expect(out.links).toEqual([]);
    expect(out.gaps).toEqual([]);
    expect(competencyKind(out, "데이터 분석")).toBe("skill");
  });
  it("reads results made before skills existed", () => {
    const old: ConnectionOutput = { links: [{ competency: "협업", experienceTitle: "팀 갈등 조율", reason: "r" }], gaps: ["도전"] };
    expect(competencyKind(old, "협업")).toBe("behavior");
    expect(competencyKind(old, "도전")).toBe("gap");
    expect(normalizeConnection(old, episodes, activities).links[0].experienceId).toBe("e2");
  });
});
