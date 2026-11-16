import { expect, test } from "@playwright/test";

test("내비게이션 4개 (탐색·공고·관리·연결)와 각 탭 첫 화면", async ({ page }) => {
  await page.goto("/postings");
  const nav = page.getByRole("navigation", { name: "주 메뉴" });
  await expect(nav.getByRole("link")).toHaveText(["탐색", "공고", "관리", "연결"]);
  await expect(nav.getByRole("link", { name: "공고" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("상태 요약")).toBeVisible();

  await nav.getByRole("link", { name: "관리" }).click();
  await expect(page.getByRole("link", { name: "만들기", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "카드", exact: true }).click();
  await expect(page.getByText("결측 데이터 정리")).toBeVisible();

  await nav.getByRole("link", { name: "연결" }).click();
  await page.getByRole("link", { name: /CJ제일제당 · 품질관리 신입/ }).click();
  await expect(page).toHaveURL(/\/connect\/demo-cj-quality$/);
  await expect(page.getByText("연결 근거")).toBeVisible();
});

test("헤더 알림함과 내 계정", async ({ page }) => {
  await page.goto("/explore/map?job=quality");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /알림/ }).click();
  await expect(page.getByRole("menuitem").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "내 계정" }).click();
  await expect(page.getByRole("heading", { name: "내 계정" })).toBeVisible();
  await expect(page.getByText("이번 달 남은 쿼터")).toBeVisible();
});

test("옛 주소는 새 탭으로 이동", async ({ page }) => {
  await page.goto("/analysis/posting/demo-cj-quality/kit");
  await expect(page).toHaveURL(/\/connect\/demo-cj-quality\/kit$/);
});
