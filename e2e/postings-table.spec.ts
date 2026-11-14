import { expect, test } from "@playwright/test";

test("POST-02 내 공고 표: 상태로 거르기와 마감 순 정렬", async ({ page }) => {
  await page.goto("/postings?view=list");
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("CJ프레시웨이"); // earliest deadline first, no-deadline last
  await expect(rows.last()).toContainText("삼양식품");
  await page.getByRole("button", { name: "지원", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("오리온");
  await page.getByRole("button", { name: "합격", exact: true }).click();
  await expect(page.getByText("이 상태의 공고가 없어요.")).toBeVisible();
});
