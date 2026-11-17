import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails } from "@/lib/auth/admin-emails";
import { normalizeCompanyJobs } from "@/lib/admin/company-jobs";

describe("FR-OPS-04 관리자", () => {
  it("reads a comma-separated list, lowercased, dropping blanks and non-addresses", () => {
    expect(parseAdminEmails(" A@x.com, b@y.co.kr ,, not-an-email ")).toEqual(["a@x.com", "b@y.co.kr"]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
  it("matches the signed-in e-mail regardless of case; no e-mail is never an admin", () => {
    const admins = ["a@x.com"];
    expect(isAdminEmail("A@X.com", admins)).toBe(true);
    expect(isAdminEmail("c@x.com", admins)).toBe(false);
    expect(isAdminEmail(undefined, admins)).toBe(false);
  });
});

describe("FR-OPS-04 회사 직무 다듬기", () => {
  it("keeps unique names, short summaries, only real job ids; rows without a job start unticked", () => {
    const out = normalizeCompanyJobs(
      {
        companyName: "CJ프레시웨이",
        jobs: [
          { family: "IT·DT", name: " 데이터분석 ", summary: "데이터로 사업 인사이트를 찾아요.", jobRoleId: "data-analysis" },
          { family: "IT·DT", name: "데이터분석", summary: "중복", jobRoleId: "data-analysis" },
          { family: "푸드서비스", name: "영양사", summary: "가".repeat(300), jobRoleId: null },
          { family: "영업", name: "외식 영업", summary: "s", jobRoleId: "no-such-job" },
        ],
      },
      ["data-analysis"],
    );
    expect(out.map((j) => [j.name, j.jobRoleId, j.include])).toEqual([
      ["데이터분석", "data-analysis", true],
      ["영양사", null, false],
      ["외식 영업", null, false],
    ]);
    expect(out[1].summary.length).toBeLessThanOrEqual(200);
  });
});
