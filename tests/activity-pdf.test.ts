import { describe, expect, it } from "vitest";
import { ActivityExtractionOutput, ActivityOutput } from "@/lib/contracts/activity";
import { DEMO_ACTIVITIES } from "@/lib/data/fixtures";

describe("FR-PREM-01 PDF로 활동 카드 만들기: 계약", () => {
  const act = { title: "CNN 이미지 분류 프로젝트", kind: "project", period: "2025.03 ~ 2025.06", role: "모델 학습", summary: "수업 팀 프로젝트로 이미지 분류 모델을 만들었어요." };

  it("accepts activities with scene candidates, and without them", () => {
    expect(ActivityOutput.safeParse({ ...act, scenes: [{ title: "데이터 증강", hint: "데이터 증강으로 과적합을 줄였다고 적혀 있어요." }] }).success).toBe(true);
    expect(ActivityOutput.safeParse(act).success).toBe(true);
  });
  it("limits scene candidates to 5 and keeps hints short", () => {
    const scene = { title: "장면", hint: "힌트" };
    expect(ActivityOutput.safeParse({ ...act, scenes: Array(6).fill(scene) }).success).toBe(false);
    expect(ActivityOutput.safeParse({ ...act, scenes: [{ title: "장면", hint: "가".repeat(201) }] }).success).toBe(false);
  });
  it("a PDF gives at most 6 activities and no episodes", () => {
    expect(ActivityExtractionOutput.safeParse({ activities: Array(7).fill(act) }).success).toBe(false);
    const parsed = ActivityExtractionOutput.parse({ activities: [act], experiences: [{ title: "x" }] });
    expect("experiences" in parsed).toBe(false);
  });
  it("demo data has an activity read from a PDF with scene candidates", () => {
    const fromPdf = DEMO_ACTIVITIES.find((a) => a.sourceLabel?.endsWith(".pdf"));
    expect(fromPdf?.scenes?.length).toBeGreaterThan(0);
  });
});
