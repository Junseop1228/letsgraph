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
  await expect(page.getByText("추천 근거").first()).toBeVisible();
});

test("헤더 알림함과 내 계정", async ({ page }) => {
  // visitors start with no saved companies (audit C-2): no badge until one is saved
  await page.goto("/company/cj");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "알림", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "관심 저장" }).click();
  await expect(page.getByRole("button", { name: "관심 저장됨" })).toBeVisible();
  await page.getByRole("button", { name: /알림 \d개 안 읽음/ }).click();
  await expect(page.getByRole("menuitem").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "내 계정" }).click();
  await expect(page.getByRole("heading", { name: "내 계정" })).toBeVisible();
  await expect(page.getByText("무료로 남은 저장")).toBeVisible();
});

test("옛 주소는 새 탭으로 이동", async ({ page }) => {
  await page.goto("/analysis/posting/demo-cj-quality/kit");
  await expect(page).toHaveURL(/\/connect\/demo-cj-quality\/kit$/);
});
