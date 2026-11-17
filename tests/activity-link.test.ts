import { describe, expect, it } from "vitest";
import { findLink, NOT_ALLOWED_MESSAGE, parseActivityLink } from "@/lib/activity/link";

const ok = (raw: string) => {
  const r = parseActivityLink(raw);
  return "link" in r ? r.link.url : `ERROR: ${r.error}`;
};

describe("PORT-06 활동 링크: GitHub 저장소만", () => {
  it("accepts repository addresses in the usual forms and keeps only owner/repo", () => {
    expect(ok("https://github.com/karpathy/nanoGPT")).toBe("https://github.com/karpathy/nanoGPT");
    expect(ok("github.com/karpathy/nanoGPT")).toBe("https://github.com/karpathy/nanoGPT");
    expect(ok("https://www.github.com/karpathy/nanoGPT.git")).toBe("https://github.com/karpathy/nanoGPT");
    expect(ok("https://github.com/karpathy/nanoGPT/tree/master/data")).toBe("https://github.com/karpathy/nanoGPT");
    expect(ok("  http://github.com/a-b/c_d.e  ")).toBe("https://github.com/a-b/c_d.e");
  });
  it("refuses any other site with the same message", () => {
    for (const u of ["https://notion.so/x/y", "https://gitlab.com/a/b", "https://velog.io/@me/post", "https://gist.github.com/a/123", "https://example.com"]) {
      expect(parseActivityLink(u)).toEqual({ error: NOT_ALLOWED_MESSAGE });
    }
  });
  it("refuses GitHub pages that are not repositories, and non-addresses", () => {
    expect(ok("https://github.com/karpathy")).toMatch(/^ERROR: 저장소 주소/);
    expect(ok("https://github.com/settings/profile")).toMatch(/^ERROR: 저장소 주소/);
    expect(ok("ftp://github.com/a/b")).toMatch(/^ERROR: 주소 형식/);
    expect(ok("")).toMatch(/^ERROR: 저장소 주소를 넣어/);
  });
  it("finds the address inside a chat message", () => {
    expect(findLink("제 프로젝트예요 https://github.com/a/b. 봐 주세요")).toBe("https://github.com/a/b");
    expect(findLink("github.com/a/b 이거요")).toBe("github.com/a/b");
    expect(findLink("블로그 https://velog.io/@me/x 에 정리했어요")).toBe("https://velog.io/@me/x");
    expect(findLink("주소 없이 소개할게요")).toBeNull();
  });
});
