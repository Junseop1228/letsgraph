import { describe, expect, it } from "vitest";
import { checkPostingUrl, decodeEntities, decodeHtml, frameSources, htmlToText, isPrivateIp, pageTitle } from "@/lib/posting/url";

describe("POST-03 받을 수 없는 주소", () => {
  it("accepts public http(s) addresses and drops the #fragment", () => {
    const r = checkPostingUrl("  https://recruit.example.co.kr/job/view?no=123#top ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.toString()).toBe("https://recruit.example.co.kr/job/view?no=123");
    expect(checkPostingUrl("http://example.com/a").ok).toBe(true);
    expect(checkPostingUrl("https://example.com:443/a").ok).toBe(true);
  });
  it("refuses malformed addresses and other protocols", () => {
    expect(checkPostingUrl("recruit.example.com").ok).toBe(false);
    expect(checkPostingUrl("ftp://example.com/a").ok).toBe(false);
    expect(checkPostingUrl("file:///etc/passwd").ok).toBe(false);
    expect(checkPostingUrl("javascript:alert(1)").ok).toBe(false);
  });
  it("refuses credentials and unusual ports", () => {
    expect(checkPostingUrl("https://user:pw@example.com/").ok).toBe(false);
    expect(checkPostingUrl("https://example.com:8080/").ok).toBe(false);
  });
  it("refuses localhost, internal names and private IPs", () => {
    for (const u of [
      "http://localhost:80/",
      "http://intranet/",
      "http://printer.local/",
      "http://db.internal/",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://172.20.0.1/",
      "http://192.168.0.10/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "http://[fd00::1]/",
      "http://[::ffff:127.0.0.1]/",
    ]) {
      expect(checkPostingUrl(u).ok, u).toBe(false);
    }
  });
});

describe("isPrivateIp", () => {
  it("separates private and public addresses", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("100.64.0.1")).toBe(true);
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("224.0.0.1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
    expect(isPrivateIp("not-an-ip")).toBe(true);
  });
});

describe("POST-03 주소 넣기: 페이지 본문 읽기", () => {
  const page = `<!doctype html><html><head><title>품질관리 신입 채용 | 예시식품</title>
    <meta property="og:title" content="[예시식품] 품질관리 신입 채용">
    <style>.x{color:red}</style><script>window.track("x")</script></head>
    <body><nav><a href="/">홈</a><a href="/jobs">채용</a></nav>
    <header><h1>품질관리 신입 채용</h1></header>
    <main><h2>주요 업무</h2><ul><li>원재료 입고 검사</li><li>완제품 품질 기준 관리</li></ul>
    <p>자격 요건&nbsp;:&nbsp;식품 관련 전공 &amp; 2027년 2월 졸업 예정자<br>마감일: 2026.11.30</p>
    <!-- hidden comment --></main><footer>회사소개 · 개인정보처리방침</footer></body></html>`;

  it("keeps posting lines and drops scripts, styles, menus and footers", () => {
    const text = htmlToText(page);
    expect(text).toContain("품질관리 신입 채용");
    expect(text).toContain("- 원재료 입고 검사");
    expect(text).toContain("자격 요건 : 식품 관련 전공 & 2027년 2월 졸업 예정자");
    expect(text).toContain("마감일: 2026.11.30");
    expect(text).not.toMatch(/track|color:red|개인정보처리방침|hidden comment/);
    expect(text.split("\n")).not.toContain("홈");
  });
  it("keeps content wrapped in a page-wide form", () => {
    expect(htmlToText(`<form id="aspnetForm"><div>지원 자격: 신입</div></form>`)).toContain("지원 자격: 신입");
  });
  it("reads the title, og:title first", () => {
    expect(pageTitle(page)).toBe("[예시식품] 품질관리 신입 채용");
    expect(pageTitle("<title> A &amp; B </title>")).toBe("A & B");
    expect(pageTitle("<p>no title</p>")).toBeUndefined();
  });
  it("finds embedded frames, resolved against the page address", () => {
    const frames = frameSources(`<iframe src="/jobs/detail?no=1&amp;v=2"></iframe><iframe src="javascript:void(0)"></iframe>`, new URL("https://jobs.example.com/view/1"));
    expect(frames.map(String)).toEqual(["https://jobs.example.com/jobs/detail?no=1&v=2"]);
  });
  it("decodes numeric and named entities", () => {
    expect(decodeEntities("&#54644;&#xC694; &lt;b&gt; &middot;")).toBe("해요 <b> ·");
  });
  it("decodes EUC-KR pages using the meta charset", () => {
    // "공고" in EUC-KR is B0 F8 B0 ED
    const head = new TextEncoder().encode('<meta charset="euc-kr"><p>');
    const bytes = new Uint8Array([...head, 0xb0, 0xf8, 0xb0, 0xed]);
    expect(decodeHtml(bytes, "text/html")).toContain("공고");
    expect(decodeHtml(new TextEncoder().encode("<p>공고</p>"), "text/html; charset=utf-8")).toContain("공고");
  });
});
