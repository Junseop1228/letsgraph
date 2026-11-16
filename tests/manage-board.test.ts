import { describe, expect, it } from "vitest";
import { boardRows, starParts } from "@/lib/manage/board";
import { Activity, Experience, ExperienceOutput } from "@/lib/contracts/activity";
import { DEMO_ACTIVITIES, DEMO_EXPERIENCES } from "@/lib/data/fixtures";

const ep = (id: string, activityId?: string): Experience =>
  Experience.parse({ id, activityId, title: id, kind: "club", situation: "s", action: "a", result: "r", competencies: [] });
const act = (id: string): Activity => Activity.parse({ id, title: id, kind: "club", summary: "" });

describe("PORT-03 카드 보드", () => {
  it("one row per activity in order, each with its own episodes", () => {
    const rows = boardRows([act("a1"), act("a2")], [ep("e1", "a2"), ep("e2", "a1"), ep("e3", "a2")]);
    expect(rows.map((r) => r.activity?.id)).toEqual(["a1", "a2"]);
    expect(rows[0].episodes.map((e) => e.id)).toEqual(["e2"]);
    expect(rows[1].episodes.map((e) => e.id)).toEqual(["e1", "e3"]);
  });
  it("keeps empty activities and puts episodes without a known activity in a last row", () => {
    const rows = boardRows([act("a1")], [ep("e1"), ep("e2", "deleted-activity")]);
    expect(rows).toHaveLength(2);
    expect(rows[0].episodes).toEqual([]);
    expect(rows[1].activity).toBeNull();
    expect(rows[1].episodes.map((e) => e.id)).toEqual(["e1", "e2"]);
  });
  it("returns no rows when there is nothing", () => {
    expect(boardRows([], [])).toEqual([]);
  });
  it("demo data: every demo episode belongs to a demo activity", () => {
    const rows = boardRows(DEMO_ACTIVITIES, DEMO_EXPERIENCES);
    expect(rows.every((r) => r.activity !== null)).toBe(true);
    expect(rows.reduce((n, r) => n + r.episodes.length, 0)).toBe(DEMO_EXPERIENCES.length);
  });
});

describe("PORT-03 에피소드 카드: S·T·A·R 표시", () => {
  it("marks filled parts, treating the no-figure placeholder as empty", () => {
    const parts = starParts({ situation: "폐기가 잦았어요", role: "", action: "기록했어요", result: "수치는 직접 확인해서 넣어요" });
    expect(parts.map((p) => `${p.key}:${p.done}`)).toEqual(["S:true", "T:false", "A:true", "R:false"]);
  });
});

describe("에피소드 계약", () => {
  it("accepts old cards without role, learning or activity", () => {
    expect(ExperienceOutput.safeParse({ title: "t", kind: "club", situation: "", action: "", result: "", competencies: [] }).success).toBe(true);
  });
  it("keeps role and learning within limits", () => {
    expect(ExperienceOutput.safeParse({ title: "t", kind: "club", situation: "", role: "가".repeat(201), action: "", result: "", competencies: [] }).success).toBe(false);
  });
});
