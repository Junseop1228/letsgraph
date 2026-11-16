import { describe, expect, it } from "vitest";
import { matchCompany } from "@/lib/posting/company";
import { COMPANIES } from "@/lib/data/fixtures";

describe("POST-05 공고 회사 맞추기", () => {
  it("matches the exact name, ignoring (주), 주식회사, spaces and case", () => {
    expect(matchCompany(COMPANIES, "CJ제일제당")?.id).toBe("cj");
    expect(matchCompany(COMPANIES, "(주)CJ 제일제당")?.id).toBe("cj");
    expect(matchCompany(COMPANIES, "주식회사 농심")?.id).toBe("nongshim");
  });
  it("matches the longest catalogue name the posting name starts with", () => {
    expect(matchCompany(COMPANIES, "CJ제일제당 식품사업부문")?.id).toBe("cj");
  });
  it("does not guess: unknown companies and empty names give null", () => {
    expect(matchCompany(COMPANIES, "삼성전자")).toBeNull();
    expect(matchCompany(COMPANIES, "  ")).toBeNull();
    expect(matchCompany(COMPANIES, "식품회사 CJ제일제당")).toBeNull(); // only a prefix counts
  });
});
