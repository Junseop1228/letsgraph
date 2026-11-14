import { expect, test } from "@playwright/test";

test("FR-CORP-04 기업 검색으로 기업 상세 열기", async ({ page }) => {
  await page.goto("/postings");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+K");
  const input = page.getByPlaceholder("직무나 기업 이름");
  await expect(input).toBeVisible();
  await input.fill("CJ제일");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/company\/cj$/);
  await expect(page.getByRole("heading", { name: "CJ제일제당" })).toBeVisible();
});

test("FR-CORP-04 직무 검색으로 그래프 열기", async ({ page }) => {
  await page.goto("/company/cj");
  await page.getByRole("button", { name: /직무, 기업 검색/ }).click();
  await page.getByPlaceholder("직무나 기업 이름").fill("해외영업");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/explore\/map\?job=overseas-sales/);
});

test("FR-CORP-04 결과 없음", async ({ page }) => {
  await page.goto("/explore/map?job=quality");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+K");
  await page.getByPlaceholder("직무나 기업 이름").fill("없는회사이름");
  await expect(page.getByText("찾는 직무나 기업이 없어요.")).toBeVisible();
});
