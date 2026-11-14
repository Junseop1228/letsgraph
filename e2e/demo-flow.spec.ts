// Demo path E2E. Test names follow the scenario names in specs/*/spec.md.
import { expect, test } from "@playwright/test";

test.describe("explore", () => {
  test("FR-DISC-01 카드를 넘겨 관심 직무 고르기 / 대표 직무 정하기", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "어떤 일이 궁금하세요?" })).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await expect(page.getByText(`${String(i + 1).padStart(2, "0")} / 06`)).toBeVisible();
      await page.getByRole("button", { name: i % 2 === 0 ? "관심 있어요" : "관심 없어요" }).click();
    }
    await expect(page.getByRole("heading", { name: "대표 직무를 하나 골라요" })).toBeVisible();
    await page.getByRole("button", { name: "품질관리" }).click();
    await expect(page).toHaveURL(/\/explore\/map\?job=quality/);
  });

  test("FR-MAP-03 그래프 열기 / 산업 열기 / 기업 고르기", async ({ page }) => {
    await page.goto("/explore/map?job=quality");
    await expect(page.getByRole("heading", { name: "품질관리" })).toBeVisible();
    await expect(page.locator("svg[aria-label='나의 취업 그래프'] g.gn")).not.toHaveCount(0);
    await page.getByRole("button", { name: /^식품/ }).first().click();
    await expect(page.getByRole("heading", { name: "식품" })).toBeVisible();
    await page.getByRole("button", { name: /CJ제일제당/ }).first().click();
    await expect(page.getByRole("link", { name: /기업 상세 보기/ })).toBeVisible();
  });

  test("FR-MAP-03 목록으로 보기", async ({ page }) => {
    await page.goto("/explore/map?job=quality");
    await page.getByRole("button", { name: "목록" }).click();
    await expect(page.getByRole("button", { name: /동원산업/ })).toBeVisible();
  });
});

test.describe("company", () => {
  test("FR-CORP-01 기업 상세 열기", async ({ page }) => {
    await page.goto("/company/cj");
    await expect(page.getByRole("heading", { name: "CJ제일제당" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "돈은 어디서 버나요?" })).toBeVisible();
    await expect(page.getByText("공시 근거").first()).toBeVisible();
  });

  test("CORP-05 직무를 정해 사업부 보기", async ({ page }) => {
    await page.goto("/company/cj/segment/cj-food?job=quality");
    await expect(page.getByText("이 사업부에서 품질관리는")).toBeVisible();
    await expect(page.getByRole("link", { name: /품질관리 신입/ })).toBeVisible();
  });

  test("FR-CORP-01 상세 정보가 없는 기업 (EX-02)", async ({ page }) => {
    await page.goto("/company/orion");
    await expect(page.getByText("상세 정보 준비 중이에요")).toBeVisible();
  });
});

test.describe("analysis", () => {
  test("FR-POST-01 공고 정리 보기", async ({ page }) => {
    await page.goto("/postings/demo-cj-quality");
    await expect(page.getByRole("heading", { name: "품질관리 신입" })).toBeVisible();
    await expect(page.getByText("작성 주의사항")).toBeVisible();
    await expect(page.getByText("공고 명시")).toBeVisible();
    await expect(page.getByText("업무상 추론")).toBeVisible();
  });

  test("FR-POST-01 데모 공고 (업로드는 연결 전)", async ({ page }) => {
    await page.goto("/postings");
    await page.locator("input[type=file]").setInputFiles({ name: "posting.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo") });
    await page.getByRole("button", { name: "공고 정리하기" }).click();
    await expect(page.locator("form p[role=alert]")).toContainText("연결되지 않았어요");
  });

  test("FR-PREM-02 연결 결과 / 빈 역량", async ({ page }) => {
    await page.goto("/connect/demo-cj-quality");
    await expect(page.getByText("연결 근거")).toBeVisible();
    await expect(page.getByText("빈 역량: 도전")).toBeVisible();
  });

  test("FR-PREM-03 Kit 열기", async ({ page }) => {
    await page.goto("/connect/demo-cj-quality/kit");
    await expect(page.getByRole("heading", { name: "Prompt Kit 완성" })).toBeVisible();
    await expect(page.locator("pre")).toContainText("<공고 출처=\"데모용 예시 공고\">");
    await expect(page.getByRole("button", { name: /복사/ })).toBeVisible();
  });
});

test.describe("manage", () => {
  test("POST-02 이번 달 달력", async ({ page }) => {
    await page.goto("/postings");
    await expect(page.getByText("상태 요약")).toBeVisible();
  });

  test("PORT-02 데모 모드 대화", async ({ page }) => {
    await page.goto("/manage?tab=chat");
    const input = page.getByLabel("메시지");
    await input.fill("카페 아르바이트");
    await input.press("Enter");
    await expect(page.getByText("처음에 어떤 문제가 있었나요?")).toBeVisible();
    await input.fill("우유 폐기가 많았어요");
    await input.press("Enter");
    await page.getByRole("button", { name: "카드 초안 만들기" }).click();
    await expect(page.getByText("AI 요약")).toBeVisible();
  });
});

test.describe("billing", () => {
  test("FR-ACCT-03 패스 화면 (결제 키 연결 전)", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.getByRole("button", { name: "시즌 패스 결제하기" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "건당 패스 결제하기" })).toBeDisabled();
  });

  test("FR-ACCT-03 결제 취소·실패 (E1)", async ({ page }) => {
    await page.goto("/billing/fail?code=PAY_PROCESS_CANCELED");
    await expect(page.getByRole("heading", { name: "결제를 취소했어요" })).toBeVisible();
  });
});
