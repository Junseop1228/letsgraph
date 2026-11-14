// Accessibility scan (axe-core, WCAG 2.x A/AA) on the demo pages. Serious and critical issues fail the test;
// the rest are printed so they can be fixed in the design pass.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/explore",
  "/explore/map?job=quality",
  "/company/cj",
  "/company/cj/segment/cj-food?job=quality",
  "/analysis",
  "/analysis/posting/demo-cj-quality",
  "/analysis/posting/demo-cj-quality/connection",
  "/analysis/posting/demo-cj-quality/kit",
  "/manage?tab=calendar",
  "/manage?tab=cards",
  "/billing",
  "/auth/login",
];

for (const path of PAGES) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    for (const v of r.violations) console.log(`[${v.impact}] ${path} ${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
    expect(bad.map((v) => `${v.id} x${v.nodes.length}`)).toEqual([]);
  });
}
