import { expect, test } from "@playwright/test";

test("FR-CORP-03 용어 팁 열고 닫기", async ({ page }) => {
  await page.goto("/company/cj");
  const tip = page.getByRole("button", { name: "영업이익 뜻" }).first();
  await tip.click();
  await expect(page.getByRole("tooltip")).toContainText("본업으로 얼마나 남겼는지");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});
