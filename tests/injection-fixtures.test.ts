import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isSuspicious } from "@/lib/safety/injection";

// SAFE-02: the attack samples in tests/fixtures/injection. Rules only, free, runs with every test run.
const read = (name: string) => readFileSync(`tests/fixtures/injection/${name}`, "utf8");
/** what text extraction would see: tags removed, hidden elements and comments kept */
const lines = (text: string) => text.replace(/<!--|-->/g, "\n").replace(/<[^>]+>/g, "\n").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const flagged = (name: string) => lines(read(name)).filter(isSuspicious);

describe("SAFE-02 주입 샘플 (규칙)", () => {
  it("posting page with hidden instructions: both hidden lines, nothing else", () => {
    const f = flagged("posting-hidden.html");
    expect(f).toHaveLength(2);
    expect(f.join(" ")).toContain("Ignore all previous instructions");
    expect(f.join(" ")).toContain("AI에게");
  });
  it("Korean posting: the three attack lines, not the LLM requirement", () => {
    const f = flagged("posting-korean.txt");
    expect(f).toHaveLength(3);
    expect(f.some((l) => l.includes("LLM 활용 경험"))).toBe(false);
  });
  it("README: the comment and the 'Dear AI' line", () => {
    expect(flagged("readme-injection.md")).toHaveLength(2);
  });
  it("company job page: both lines aimed at the AI, none of the real jobs", () => {
    const f = flagged("company-page-injection.txt");
    expect(f).toHaveLength(2);
    expect(f.some((l) => l.includes("국내영업") || l.includes("인사"))).toBe(false);
  });
});