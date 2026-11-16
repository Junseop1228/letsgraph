import { describe, expect, it } from "vitest";
import { clampActivity } from "@/lib/ai/clamp";
import { ActivityOutput } from "@/lib/contracts/activity";
import { DEMO_ACTIVITIES } from "@/lib/data/fixtures";

describe("PORT-03 사용한 데이터", () => {
  const base = { title: "CNN 이미지 분류 프로젝트", kind: "project" as const, summary: "MNIST로 CNN 모델을 만들었어요." };

  it("keeps a one-line dataset and trims an over-long one to 200 characters", () => {
    expect(clampActivity({ ...base, dataset: "MNIST 손글씨 이미지 7만 장, 공개 데이터" }).dataset).toBe("MNIST 손글씨 이미지 7만 장, 공개 데이터");
    expect(clampActivity({ ...base, dataset: "데이터 ".repeat(100) }).dataset!.length).toBeLessThanOrEqual(200);
  });
  it("leaves dataset empty when there is none", () => {
    expect(clampActivity({ ...base, dataset: "   " }).dataset).toBeUndefined();
    expect(clampActivity(base).dataset).toBeUndefined();
  });
  it("refuses more than 200 characters in the contract", () => {
    expect(ActivityOutput.safeParse({ ...base, dataset: "가".repeat(201) }).success).toBe(false);
  });
  it("demo data shows the dataset of a data project", () => {
    expect(DEMO_ACTIVITIES.find((a) => a.id === "act-contest")?.dataset).toContain("공공 데이터");
  });
});
