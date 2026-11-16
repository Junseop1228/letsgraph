import { describe, expect, it } from "vitest";
import { clampActivity, clampEpisode, clampSuggestions, cutText } from "@/lib/ai/clamp";
import { EPISODE_THEME_LABEL, EpisodeTheme, ExperienceOutput } from "@/lib/contracts/activity";

describe("PORT-02 조금 넘친 결과는 길이만 맞춤", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(cutText("  짧은   글이에요. ", 40)).toBe("짧은 글이에요.");
  });
  it("cuts at a sentence end when one is close, otherwise with an ellipsis", () => {
    const s = "첫 문장이에요. 두 번째 문장도 꽤 길게 이어져요. 세 번째 문장은 잘릴 거예요";
    const out = cutText(s, 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("요.")).toBe(true);
    const t = cutText("가".repeat(50), 40);
    expect(t).toHaveLength(40);
    expect(t.endsWith("…")).toBe(true);
  });
  it("an over-long episode becomes a valid draft: title cut, competencies deduplicated and capped at 5", () => {
    const ep = clampEpisode({
      title: "데이터 증강 기법을 적용해서 CNN 이미지 분류 모델의 정확도를 97퍼센트에서 99퍼센트로 끌어올린 경험",
      kind: "project",
      theme: "problem",
      situation: "모델 성능을 더 올리고 싶었어요.",
      action: "확대, 회전 같은 증강을 적용했어요.",
      result: "정확도가 97%에서 99%로 올랐어요.",
      competencies: ["데이터 증강", "모델 성능 개선", "CNN", "문제 해결", "CNN", "실험 설계", "파이썬"],
    });
    expect(ExperienceOutput.safeParse(ep).success).toBe(true);
    expect(ep.title.length).toBeLessThanOrEqual(40);
    expect(ep.competencies).toEqual(["데이터 증강", "모델 성능 개선", "CNN", "문제 해결", "실험 설계"]);
    expect(ep.result).toBe("정확도가 97%에서 99%로 올랐어요."); // numbers are kept as said
  });
  it("an activity keeps at most 5 scenes and drops empty ones; summary up to 800 characters", () => {
    const a = clampActivity({
      title: "CNN 프로젝트",
      kind: "project",
      summary: "요약이에요. ".repeat(200),
      scenes: [{ title: "", hint: "" }, ...Array.from({ length: 7 }, (_, i) => ({ title: `장면 ${i}`, hint: "힌트" }))],
    });
    expect(a.summary.length).toBeLessThanOrEqual(800);
    expect(a.scenes).toHaveLength(5);
    expect(a.scenes?.[0].title).toBe("장면 0");
  });
});

describe("PORT-04 추천 에피소드", () => {
  it("has the four themes from the team's question guide", () => {
    expect(EpisodeTheme.options).toEqual(["problem", "collab", "growth", "motive"]);
    expect(Object.values(EPISODE_THEME_LABEL)).toEqual(["문제 해결·직무 역량", "협업·갈등", "성장·가치관", "직무 관심 계기"]);
  });
  it("keeps at most 4 suggestions, drops empty titles and trims reasons", () => {
    const out = clampSuggestions({
      suggestions: [
        { theme: "problem", title: "", why: "" },
        ...Array.from({ length: 5 }, () => ({ theme: "collab" as const, title: "역할 나누기", why: "이유".repeat(100) })),
      ],
    });
    expect(out).toHaveLength(4);
    expect(out.every((s) => s.why.length <= 120)).toBe(true);
  });
});

describe("PORT-03 사용한 데이터", () => {
  it("keeps the dataset line, trims it to 200 characters, and leaves it out when empty", () => {
    const base = { title: "CNN 프로젝트", kind: "project" as const, summary: "요약" };
    expect(clampActivity({ ...base, dataset: " MNIST 손글씨 이미지 7만 장,  공개 데이터 " }).dataset).toBe("MNIST 손글씨 이미지 7만 장, 공개 데이터");
    expect(clampActivity({ ...base, dataset: "가".repeat(300) }).dataset?.length).toBeLessThanOrEqual(200);
    expect(clampActivity({ ...base, dataset: "  " }).dataset).toBeUndefined();
    expect(clampActivity(base).dataset).toBeUndefined();
  });
});