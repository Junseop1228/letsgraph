import { describe, expect, it } from "vitest";
import { dDay, formatChange, formatEok, formatEokShort, percentChange, share } from "@/lib/format";

describe("formatEok", () => {
  it("joins 조 and 억 with grouping", () => {
    expect(formatEok(177549)).toBe("17조 7,549억");
    expect(formatEok(115221)).toBe("11조 5,221억");
  });
  it("handles small, exact and empty values", () => {
    expect(formatEok(5255)).toBe("5,255억");
    expect(formatEok(20000)).toBe("2조");
    expect(formatEok(0)).toBe("0억");
    expect(formatEok(null)).toBe("—");
  });
  it("keeps the sign for losses", () => {
    expect(formatEok(-1323)).toBe("−1,323억");
  });
});

describe("formatEokShort", () => {
  it("uses 조 with up to two decimals", () => {
    expect(formatEokShort(177549)).toBe("17.75조");
    expect(formatEokShort(39594)).toBe("3.96조");
    expect(formatEokShort(20000)).toBe("2조");
    expect(formatEokShort(8612)).toBe("8,612억");
  });
});

describe("changes", () => {
  it("shows arrow and sign, never colour alone", () => {
    expect(formatChange(1.5)).toBe("▲ +1.5%");
    expect(formatChange(-15.3)).toBe("▼ −15.3%");
    expect(formatChange(null)).toBe("—");
  });
  it("computes percent change and share", () => {
    expect(percentChange(113530, 115221)).toBe(1.5);
    expect(percentChange(0, 10)).toBeNull();
    expect(share(115221, 177549)).toBe(64.9);
  });
});

describe("dDay", () => {
  const today = new Date("2026-11-13T03:00:00Z"); // 12:00 in Seoul
  it("counts days to the deadline in Seoul time", () => {
    expect(dDay("2026-11-24", today)).toBe("D-11");
    expect(dDay("2026-11-13", today)).toBe("D-Day");
    expect(dDay("2026-11-12", today)).toBe("마감");
    expect(dDay(null, today)).toBe("미정");
  });
});
