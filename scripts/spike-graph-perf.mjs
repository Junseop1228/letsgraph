// Graph-engine spike perf gate (context/research-graph-engine.md §4; decisions D 2026-11-15 20:56).
// Frame times while the force simulation settles and while a node is dragged, at 1x and 4x CPU throttle,
// for the React Flow engine (default) and the old d3/SVG engine (&engine=d3), real data and ?stress=150.
// Run against a started app: node scripts/spike-graph-perf.mjs  (BASE=http://localhost:3000)
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://localhost:3000";
const cases = [
  ["flow real", "/explore/map?job=quality"],
  ["d3   real", "/explore/map?job=quality&engine=d3"],
  ["flow 80", "/explore/map?job=quality&stress=80"],
  ["d3   80", "/explore/map?job=quality&stress=80&engine=d3"],
  ["flow 150", "/explore/map?job=quality&stress=150"],
  ["d3   150", "/explore/map?job=quality&stress=150&engine=d3"],
];

function stats(ft) {
  const s = [...ft].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
  const total = ft.reduce((a, b) => a + b, 0);
  return { fps: total ? Math.round((ft.length / total) * 1000) : 0, p50: q(0.5).toFixed(1), p95: q(0.95).toFixed(1), max: (s[s.length - 1] ?? 0).toFixed(0), long: ft.filter((x) => x > 50).length };
}

const browser = await chromium.launch();
for (const [name, path] of cases) {
  for (const rate of [1, 4]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    await page.addInitScript(() => {
      window.__ft = [];
      let last = performance.now();
      const loop = (t) => { window.__ft.push(t - last); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    await page.goto(base + path, { waitUntil: "load" });
    const sel = "[data-gn], g.gn";
    await page.waitForSelector(sel, { timeout: 30000 });
    await page.evaluate(() => { window.__ft = []; });
    await page.waitForTimeout(3000);
    const settle = stats(await page.evaluate(() => window.__ft.slice(1)));
    const count = await page.locator(sel).count();

    // drag the last node 160px to the right over ~1 s (reheats the simulation)
    const box = await page.locator(sel).last().boundingBox();
    let drag = null;
    if (box) {
      await page.evaluate(() => { window.__ft = []; });
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 30; i++) { await page.mouse.move(x + i * 5.3, y + i * 2, { steps: 1 }); await page.waitForTimeout(33); }
      await page.mouse.up();
      await page.waitForTimeout(500);
      drag = stats(await page.evaluate(() => window.__ft.slice(1)));
    }
    console.log(`${name} x${rate} nodes=${count} | settle fps ${settle.fps} p50 ${settle.p50} p95 ${settle.p95} max ${settle.max} long ${settle.long} | drag fps ${drag?.fps} p95 ${drag?.p95} long ${drag?.long}`);
    await ctx.close();
  }
}
await browser.close();
