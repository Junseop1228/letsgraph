// Guard (audit 2026-11-16): tokens.css defines --spacing-xs..4xl, and Tailwind v4 resolves w-/max-w-/min-w-/basis-<name>
// against those spacing tokens before --container-*, so `max-w-sm` became 8px and broke the login page and the explore list.
// Use the numeric scale (max-w-96 = 24rem) or a named layout token (max-w-reading-max) instead.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BAD = /\b(?:max-w|min-w|w|basis)-(?:xs|sm|md|lg|xl|[2-7]xl)(?![\w-])/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.(tsx|ts)$/.test(name) ? [p] : [];
  });
}

describe("token name collisions", () => {
  it("no width utility uses a container size name (xs..7xl)", () => {
    const hits: string[] = [];
    for (const f of [...files("app"), ...files("components")]) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (BAD.test(line)) hits.push(`${f}:${i + 1}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
