// Demo path E2E. Test names follow the scenario names in specs/*/spec.md.
import { expect, test } from "@playwright/test";

test.describe("explore", () => {
  test("FR-DISC-01 직군 고르기 / 카드를 넘겨 관심 직무 고르기 / 산업 고르기 / 회사 성격 고르기", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: "어떤 일이 궁금하세요?" })).toBeVisible();
    await page.getByRole("group", { name: "직군" }).getByRole("button", { name: "생산·품질" }).click();
    await page.getByRole("button", { name: "직무 카드 넘기기" }).click();
    // like only 품질관리; the number of 생산·품질 cards differs between the demo data and the DB
    const card = page.locator("article[aria-label$=' 카드']");
    for (let n = 0; n < 15 && (await card.count()); n++) {
      const label = (await card.getAttribute("aria-label")) ?? "";
      await page.getByRole("button", { name: label === "품질관리 카드" ? "관심 있어요" : "관심 없어요" }).click();
      // the last card leaves the page between count() and getAttribute(): read with a short timeout (was flaky)
      await expect.poll(async () => ((await card.count()) ? await card.getAttribute("aria-label", { timeout: 300 }).catch(() => null) : null)).not.toBe(label);
    }
    await expect(page.getByRole("heading", { name: "어떤 산업이 궁금하세요?" })).toBeVisible();
    const chips = page.getByRole("group", { name: "산업" }).getByRole("button");
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByRole("heading", { name: "어떤 회사가 궁금하세요?" })).toBeVisible();
    await page.getByRole("group", { name: "회사 성격" }).getByRole("button", { name: /이름 있는 큰 회사/ }).click();
    await expect(page).toHaveURL(/\/explore\/map\?job=quality/);
    const cookies = async () => (await page.context().cookies()).map((c) => `${c.name}=${c.value}`);
    await expect.poll(cookies).toContain("lg_company_type=large");
    await expect.poll(async () => (await cookies()).some((c) => c.startsWith("lg_industries="))).toBe(true);
    await expect(page.getByRole("heading", { name: "품질관리" })).toBeVisible();
  });

  test("FR-DISC-01 카드를 끝낼 때까지 탐색 탭에", async ({ page }) => {
    const card = page.locator("article[aria-label$=' 카드']");
    const onboarded = async () => (await page.context().cookies()).some((c) => c.name === "lg_onboarded");
    await page.goto("/");
    await expect(page).toHaveURL(/\/explore$/);
    await expect(page.getByRole("heading", { name: "어떤 일이 궁금하세요?" })).toBeVisible();
    // leave mid-way: the 탐색 tab brings the deck back where it was (same session), not the graph
    await page.getByRole("group", { name: "직군" }).getByRole("button", { name: "생산·품질" }).click();
    await page.getByRole("button", { name: "직무 카드 넘기기" }).click();
    const first = (await card.getAttribute("aria-label")) ?? "";
    await page.getByRole("button", { name: "관심 없어요" }).click();
    await expect(card).not.toHaveAttribute("aria-label", first);
    const second = (await card.getAttribute("aria-label")) ?? "";
    await page.getByRole("link", { name: "공고", exact: true }).first().click();
    await expect(page).toHaveURL(/\/postings/);
    await page.getByRole("link", { name: "탐색", exact: true }).first().click();
    await expect(page).toHaveURL(/\/explore$/);
    await expect(card).toHaveAttribute("aria-label", second);
    expect(await onboarded()).toBe(false);
    await page.goto("/explore/map");
    await expect(page).toHaveURL(/\/explore$/);
    // skipping ends the deck: from now on "/" and the 탐색 tab open the graph
    await page.getByRole("button", { name: "건너뛰고 직무 맵 보기" }).click();
    await expect(page).toHaveURL(/\/explore\/map\?job=/);
    await expect.poll(onboarded).toBe(true);
    await page.goto("/");
    await expect(page).toHaveURL(/\/explore\/map$/);
    await page.goto("/explore");
    await expect(page).toHaveURL(/\/explore\/map$/);
    await expect(page.getByRole("link", { name: "탐색", exact: true }).first()).toHaveAttribute("href", "/explore");
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

  test("FR-MAP-03 조건 바꾸기", async ({ page }) => {
    await page.goto("/explore/map?job=quality");
    await expect(page.getByRole("heading", { name: "품질관리" })).toBeVisible();
    await page.getByRole("button", { name: /^조건 바꾸기/ }).click();
    const panel = page.getByRole("dialog", { name: "조건 바꾸기" });
    await expect(panel).toBeVisible();
    const apply = panel.getByRole("button", { name: "그래프 바꾸기" });
    await expect(apply).toBeDisabled();
    await panel.getByRole("group", { name: "회사 성격" }).getByRole("button", { name: "탄탄한 중견" }).click();
    await apply.click();
    await expect(panel).toBeHidden();
    const cookies = async () => (await page.context().cookies()).map((c) => `${c.name}=${c.value}`);
    await expect.poll(cookies).toContain("lg_company_type=mid");
    // the graph is drawn again with the new condition; the star I had on stays
    // the server re-selects companies (live DB: a few seconds)
    await expect(page.getByRole("button", { name: /조건 바꾸기: 중견/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/조건을 (바꿨어요|조금 넓혀서 보여드려요)/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "품질관리" })).toBeVisible();
    await expect(page.locator("[aria-label='나의 취업 그래프'] [data-gn]")).not.toHaveCount(0);
    // Esc closes the panel
    await page.getByRole("button", { name: /조건 바꾸기: 중견/ }).click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
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
    // with the live catalogue and keys, a company without segments is analysed on first view (FR-OPS-03), so this
    // keyless notice only shows in the demo data (CI)
    test.skip(process.env.DATA_SOURCE === "supabase" && !!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !!process.env.DART_API_KEY, "first-view analysis with keys");
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
    test.skip(Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY), "AI key is set in .env.local: upload is live, not the keyless demo");
    await page.goto("/postings");
    await page.getByText("붙여넣기나 PDF로 추가해요").click(); // collapsed since audit P-4
    await page.locator("input[type=file]").setInputFiles({ name: "posting.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo") });
    await page.getByRole("button", { name: "공고 정리하기" }).click();
    await expect(page.locator("form p[role=alert]")).toContainText("연결되지 않았어요");
  });

  test("FR-PREM-02 지원 근거 / 근거 없는 조건", async ({ page }) => {
    await page.goto("/connect/demo-cj-quality");
    await expect(page.getByText("추천 근거").first()).toBeVisible();
    // pick a competency -> its card -> details and the reason
    await page.getByRole("button", { name: /주도성/ }).click();
    await page.getByRole("button", { name: /카드를 눌러 상세 보기/ }).click(); // the recommended card in the right panel
    await expect(page.getByText("감보다 기록이 설득력이 있다는 걸 배웠어요.")).toBeVisible();
    // a competency with no card says so and leads to 만들기
    await page.getByRole("button", { name: /도전/ }).click();
    await expect(page.getByText("이 조건을 보여 줄 카드가 아직 없어요.")).toBeVisible();
    await expect(page.getByRole("link", { name: /에피소드 꺼내러 가기/ })).toBeVisible();
  });

  test("FR-PREM-03 Kit 열기", async ({ page }) => {
    await page.goto("/connect/demo-cj-quality/kit");
    await expect(page.getByRole("heading", { name: "프롬프트 키트" })).toBeVisible();
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
    test.skip(Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY), "AI key is set in .env.local: the coach is live Gemini, not the fixed demo script");
    await page.goto("/manage?tab=chat");
    await page.getByRole("button", { name: /카페 아르바이트/ }).click();
    await expect(page.getByLabel("AI 코치와 대화").getByText("에피소드를 꺼내 볼게요")).toBeVisible();
    const input = page.getByLabel("메시지");
    await input.fill("마감 후 폐기가 많던 날");
    await input.press("Enter");
    // the same coach line also sits in the saved 대화 기록 list, so look inside the chat only (CI runs keyless)
    await expect(page.getByLabel("AI 코치와 대화").getByText("처음에 어떤 문제가 있었나요?")).toBeVisible();
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
    await page.getByRole("button", { name: /카페 아르바이트.*자세히 보기/ }).click();
    await expect(detail.getByText("사용한 데이터")).toBeVisible();
    await detail.getByRole("button", { name: "자세히 접기" }).click();
    await expect(page.getByRole("button", { name: "자세히 펼치기" })).toBeVisible();
  });
});

test.describe("billing", () => {
  test("FR-ACCT-03 패스 화면 (결제 키 연결 전)", async ({ page }) => {
    test.skip(Boolean(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY), "Toss test keys are set in .env.local: checkout is enabled");
    await page.goto("/billing");
    await expect(page.getByRole("button", { name: "시즌 패스 결제하기" })).toBeDisabled();
  });

  test("FR-ACCT-03 결제 취소·실패 (E1)", async ({ page }) => {
    await page.goto("/billing/fail?code=PAY_PROCESS_CANCELED");
    await expect(page.getByRole("heading", { name: "결제를 취소했어요" })).toBeVisible();
  });
});
