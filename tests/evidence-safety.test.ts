import { describe, expect, it } from "vitest";
import { creatorHash, EVIDENCE_DAILY_LIMIT, mayCheckEvidence } from "@/lib/posting/creator";

describe("SAFE-03 공용 근거 보호", () => {
  const secret = "a-long-random-secret-for-tests";
  it("the same person gets the same short hash; another person or secret a different one", () => {
    const a = creatorHash("user-1", secret);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(creatorHash("user-1", secret)).toBe(a);
    expect(creatorHash("user-2", secret)).not.toBe(a);
    expect(creatorHash("user-1", `${secret}-2`)).not.toBe(a);
    expect(a).not.toContain("user-1");
  });
  it("no (or too short a) secret: no hash", () => {
    expect(creatorHash("user-1", undefined)).toBeNull();
    expect(creatorHash("user-1", "short")).toBeNull();
  });
  it("postings feed shared data at most 10 times a day per person", () => {
    expect(EVIDENCE_DAILY_LIMIT).toBe(10);
    expect(mayCheckEvidence(10)).toBe(true);
    expect(mayCheckEvidence(11)).toBe(false);
  });
});