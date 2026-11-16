import { describe, expect, it } from "vitest";
import { growthOf, revenueGrowthByCompany, type FinRow } from "@/lib/reference/growth";

const row = (company_id: string, year: number, fs_div: "CFS" | "OFS", revenue: number | null): FinRow => ({ company_id, year, fs_div, revenue });

describe("growthOf (3-year revenue growth)", () => {
  it("is the average yearly growth from two years before the latest", () => {
    expect(growthOf([row("a", 2022, "CFS", 100), row("a", 2023, "CFS", 110), row("a", 2024, "CFS", 121)])).toBe(0.1);
  });
  it("uses 연결 first and never mixes bases", () => {
    const rows = [row("a", 2022, "CFS", 100), row("a", 2024, "CFS", 144), row("a", 2022, "OFS", 100), row("a", 2024, "OFS", 400)];
    expect(growthOf(rows)).toBe(0.2);
  });
  it("falls back to 별도 when 연결 lacks the base year", () => {
    const rows = [row("a", 2024, "CFS", 500), row("a", 2022, "OFS", 100), row("a", 2024, "OFS", 225)];
    expect(growthOf(rows)).toBe(0.5);
  });
  it("is null when a year is missing or a revenue is not positive", () => {
    expect(growthOf([row("a", 2023, "CFS", 100), row("a", 2024, "CFS", 120)])).toBeNull();
    expect(growthOf([row("a", 2022, "CFS", 0), row("a", 2024, "CFS", 120)])).toBeNull();
    expect(growthOf([row("a", 2022, "CFS", 100), row("a", 2024, "CFS", null)])).toBeNull();
  });
  it("groups rows by company", () => {
    const m = revenueGrowthByCompany([row("a", 2022, "CFS", 100), row("a", 2024, "CFS", 121), row("b", 2024, "OFS", 10)]);
    expect([...m.entries()]).toEqual([["a", 0.1]]);
  });
});
