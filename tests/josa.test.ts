import { describe, expect, it } from "vitest";
import { josaRo, withRo } from "@/lib/manage/josa";
import { EPISODE_THEME_LABEL } from "@/lib/contracts/activity";

describe("PORT-04 테마 바꾸기 문구의 조사", () => {
  it("uses 으로 after a final consonant and 로 after a vowel or ㄹ", () => {
    expect(josaRo("협업·갈등")).toBe("으로");
    expect(josaRo("문제 해결·직무 역량")).toBe("으로");
    expect(josaRo("성장·가치관")).toBe("으로");
    expect(josaRo("직무 관심 계기")).toBe("로");
    expect(josaRo("서울")).toBe("로"); // ㄹ
    expect(josaRo("CNN")).toBe("로");
  });
  it("builds the button text for every theme", () => {
    expect(Object.values(EPISODE_THEME_LABEL).map(withRo)).toEqual([
      "문제 해결·직무 역량으로",
      "협업·갈등으로",
      "성장·가치관으로",
      "직무 관심 계기로",
    ]);
  });
});
