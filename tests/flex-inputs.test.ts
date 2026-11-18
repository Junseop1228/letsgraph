// Guard (design pass 2026-11-18): an <input> that fills a flex row with flex-1 must also set a width (w-0 or w-full).
// With only min-w-0, the input still adds its intrinsic width (20 characters x the font's average character width) to
// the min-content width of the grid column around it. Android Chrome takes Pretendard's average width from its Hangul
// glyphs (~1em), so the 관리 chat input became ~21em wide and the whole page zoomed out on a 360px phone.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.tsx$/.test(name) ? [p] : [];
  });
}

describe("flex inputs", () => {
  it("every <input> with flex-1 also sets w-0 or w-full", () => {
    const hits: string[] = [];
    for (const f of [...files("app"), ...files("components")]) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/<input\b(?:(?!\/>)[\s\S])*?className=(?:"([^"]*)"|\{cn\(([^)]*)\))/g)) {
        const cls = m[1] ?? m[2] ?? "";
        if (/\bflex-1\b/.test(cls) && !/(?:^|[\s"])w-(?:0|full)(?=[\s"]|$)/.test(cls)) hits.push(`${f}: ${cls.slice(0, 60)}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
