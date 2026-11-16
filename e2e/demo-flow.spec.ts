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

  test("FR-DISC-01 처음 한 번만 자동으로", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole("heading", { name: "어떤 일이 궁금하세요?" })).toBeVisible();
    await expect.poll(async () => (await page.context().cookies()).some((c) => c.name === "lg_onboarded")).toBe(true);
    await page.goto("/");
    await expect(page).toHaveURL(/\/explore\/map$/);
    await page.goto("/explore");
    await expect(page).toHaveURL(/\/explore\/map$/);
    await expect(page.getByRole("link", { name: "탐색" }).first()).toHaveAttribute("href", "/explore/map");
    await page.getByRole("link", { name: "직무 더 고르기" }).click();
    await expect(page.getByRole("heading", { name: "어떤 일이 궁금하세요?" })).toBeVisible();
  });

  test("FR-MAP-03 그래프 열기 / 산업 열기 / 기업 고르기", async ({ page }) => {
    await page.goto("/explore/map?job=quality");
    await expect(page.getByRole("heading", { name: "품질관리" })).toBeVisible();
    await expect(page.locator("[aria-label='나의 취업 그래프'] [data-gn]")).not.toHaveCount(0);
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
    await page.getByText("붙여넣기나 PDF로 추가해요").click(); // collapsed since audit P-4
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
    await expect(page.getByText("가장 가까운 마감")).toBeVisible();
    await page.getByRole("link", { name: "다음 달" }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
    await expect(page.getByRole("link", { name: "이번 달" })).toBeVisible();
  });

  test("PORT-02 데모 모드 대화 (활동 고르기 → 에피소드 꺼내기)", async ({ page }) => {
    await page.goto("/manage?tab=chat");
    await page.getByRole("button", { name: /카페 아르바이트/ }).click();
    await expect(page.getByText("에피소드를 꺼내 볼게요")).toBeVisible();
    const input = page.getByLabel("메시지");
    await input.fill("마감 후 폐기가 많던 날");
    await input.press("Enter");
    await expect(page.getByText("처음에 어떤 문제가 있었나요?")).toBeVisible();
    await input.fill("우유 폐기가 많았어요");
    await input.press("Enter");
    await page.getByRole("button", { name: "에피소드 초안 만들기" }).click();
    await expect(page.getByText("AI 요약")).toBeVisible();
  });

  test("PORT-03 카드 보드와 에피소드 자세히", async ({ page }) => {
    await page.goto("/manage?tab=cards");
    await expect(page.getByRole("list", { name: "카페 아르바이트 에피소드" })).toBeVisible();
    await page.getByRole("button", { name: /재고 폐기 줄이기/ }).click();
    const detail = page.getByRole("complementary", { name: "자세히" });
    await expect(detail.getByRole("heading", { name: "재고 폐기 줄이기" })).toBeVisible();
    await expect(detail.getByText("감보다 기록이 설득력이 있다는 걸 배웠어요.")).toBeVisible();
    await page.getByRole("button", { name: "카페 아르바이트 활동 자세히 보기" }).click();
    await expect(detail.getByText("사용한 데이터")).toBeVisible();
    await detail.getByRole("button", { name: "자세히 접기" }).click();
    await expect(page.getByRole("button", { name: "자세히 펼치기" })).toBeVisible();
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
