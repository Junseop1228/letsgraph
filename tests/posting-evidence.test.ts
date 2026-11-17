import { describe, expect, it } from "vitest";
import { decideEvidence, domainOf, isJobBoard, isNotAPosting } from "@/lib/posting/evidence-check";

describe("POST-07 공고 근거 판단", () => {
  it("normalises URLs and hosts to a domain", () => {
    expect(domainOf("https://www.Saramin.co.kr/zf_user/jobs/view?rec_idx=1")).toBe("saramin.co.kr");
    expect(domainOf("recruit.cj.net")).toBe("recruit.cj.net");
    expect(domainOf("jumpit.saramin.co.kr")).toBe("jumpit.saramin.co.kr");
  });
  it("knows job boards (with subdomains) and places that do not post jobs", () => {
    expect(isJobBoard("jumpit.saramin.co.kr")).toBe(true);
    expect(isJobBoard("wanted.co.kr")).toBe(true);
    expect(isJobBoard("cj.net")).toBe(false);
    expect(isNotAPosting("someone.tistory.com")).toBe(true);
    expect(isNotAPosting("blog.naver.com")).toBe(true);
  });
  it("a job-board URL is evidence by itself", () => {
    expect(decideEvidence("https://www.jobkorea.co.kr/Recruit/GI_Read/1")).toEqual({ method: "submitted_url", domain: "jobkorea.co.kr", url: "https://www.jobkorea.co.kr/Recruit/GI_Read/1" });
  });
  it("from a web search: a job board, or the company's official site, but never a blog or community", () => {
    expect(decideEvidence(null, [{ domain: "blog.naver.com", kind: "official" }, { domain: "recruit.cj.net", kind: "official" }])).toEqual({ method: "web_search", domain: "recruit.cj.net" });
    expect(decideEvidence(null, [{ domain: "catch.co.kr", kind: "other" }])).toEqual({ method: "web_search", domain: "catch.co.kr" });
    expect(decideEvidence(null, [{ domain: "unknown-board.kr", kind: "job_board" }])).toBeNull(); // not a known job board
    expect(decideEvidence(null, [{ domain: "news.naver.com", kind: "other" }])).toBeNull();
    expect(decideEvidence(null, [])).toBeNull();
  });
  it("keeps the submitted URL when the search confirms its site", () => {
    expect(decideEvidence("https://recruit.cj.net/jobs/123", [{ domain: "recruit.cj.net", kind: "official" }])).toEqual({ method: "submitted_url", domain: "recruit.cj.net", url: "https://recruit.cj.net/jobs/123" });
  });
});
