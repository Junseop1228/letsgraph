// Graph-engine spike layout check (not a test): overlaps, clipping and minimum text size of graph nodes.
// node scripts/spike-graph-geometry.mjs
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch();

async function check(name, path, { mobile = false, open = false } = {}) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForSelector("[data-gn], g.gn", { timeout: 30000 });
  await page.waitForTimeout(2500);
  if (open) {
    await page.getByRole("button", { name: /^식품/ }).first().click();
    await page.waitForTimeout(3000);
  }
  const r = await page.evaluate(() => {
    const pane = document.querySelector("[aria-label='나의 취업 그래프']") ?? document.querySelector("svg[aria-label='나의 취업 그래프']");
    const pb = pane.getBoundingClientRect();
    const els = [...document.querySelectorAll("[data-gn], g.gn")];
    const boxes = els.map((e) => e.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) overlaps++;
      }
    const clipped = boxes.filter((b) => b.left < pb.left || b.right > pb.right || b.top < pb.top || b.bottom > pb.bottom).length;
    const fonts = els.flatMap((e) => [...e.querySelectorAll("span, text")].map((s) => parseFloat(getComputedStyle(s).fontSize) * (s.getBoundingClientRect().height / (s.offsetHeight || s.getBoundingClientRect().height || 1))));
    const plane = document.querySelector("path.gplane")?.getAttribute("d")?.length ?? 0;
    const zoom = document.querySelector(".react-flow__viewport")?.style.transform ?? "";
    return { nodes: els.length, overlaps, clipped, minFont: Math.min(...fonts).toFixed(1), plane, zoom };
  });
  console.log(name.padEnd(18), JSON.stringify(r));
  await ctx.close();
}

await check("flow desktop", "/explore/map?job=quality");
await check("flow desktop open", "/explore/map?job=quality", { open: true });
await check("d3 desktop open", "/explore/map?job=quality&engine=d3", { open: true });
await check("flow mobile open", "/explore/map?job=quality", { mobile: true, open: true });
await check("flow stress150", "/explore/map?job=quality&stress=150");
await browser.close();
