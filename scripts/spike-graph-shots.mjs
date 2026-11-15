// Graph-engine spike screenshots (not a test): React Flow engine vs old d3 engine, light/dark, desktop/mobile.
// node scripts/spike-graph-shots.mjs -> .logs/shots/*.png
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.BASE ?? "http://localhost:3000";
const out = ".logs/shots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function shot(name, { path, theme = "light", mobile = false, act }) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForSelector("[data-gn], g.gn", { timeout: 30000 });
  await page.waitForTimeout(2500);
  if (act) await act(page);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name, errors.length ? `ERRORS: ${errors.slice(0, 3).join(" | ")}` : "ok");
  await ctx.close();
}

const openFood = async (page) => {
  await page.getByRole("button", { name: /^식품/ }).first().click();
  await page.waitForTimeout(2500);
};
const hoverFood = async (page) => {
  await openFood(page);
  await page.getByRole("button", { name: /^식품/ }).first().hover();
  await page.waitForTimeout(400);
};

await shot("flow-light", { path: "/explore/map?job=quality" });
await shot("flow-light-open", { path: "/explore/map?job=quality", act: openFood });
await shot("flow-light-hover", { path: "/explore/map?job=quality", act: hoverFood });
await shot("flow-dark-open", { path: "/explore/map?job=quality", theme: "dark", act: openFood });
await shot("flow-mobile-open", { path: "/explore/map?job=quality", mobile: true, act: openFood });
await shot("d3-light-open", { path: "/explore/map?job=quality&engine=d3", act: openFood });
await shot("flow-stress", { path: "/explore/map?job=quality&stress=150" });
await browser.close();
