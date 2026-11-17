// 공고 근거 판단 (specs/posting POST-07): does a submitted URL or a web search source count as evidence that the
// company posted this job? Job boards are recognised by domain; a source the AI calls the company's official site
// counts unless it is a blog, community, wiki or social site. Pure, unit-tested.

/** Korean job boards and recruiting systems where companies post jobs (subdomains count too). */
export const JOB_BOARD_DOMAINS = [
  "saramin.co.kr",
  "jobkorea.co.kr",
  "wanted.co.kr",
  "catch.co.kr",
  "incruit.com",
  "jobplanet.co.kr",
  "linkareer.com",
  "jasoseol.com",
  "work24.go.kr",
  "work.go.kr",
  "rememberapp.co.kr",
  "peoplenjob.com",
  "recruiter.co.kr",
  "greetinghr.com",
  "ninehire.com",
];

/** Places that write about jobs but do not post them. */
const NOT_A_POSTING = [
  "blog.naver.com", "cafe.naver.com", "tistory.com", "brunch.co.kr", "velog.io", "medium.com", "namu.wiki",
  "wikipedia.org", "youtube.com", "instagram.com", "facebook.com", "x.com", "twitter.com", "teamblind.com",
  "dcinside.com", "clien.net", "reddit.com", "news.naver.com", "news.daum.net",
];

/** "https://www.Saramin.co.kr/zf_user/..." or "saramin.co.kr" -> "saramin.co.kr". */
export function domainOf(urlOrHost: string): string {
  const s = urlOrHost.trim().toLowerCase();
  let host = s;
  try {
    host = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname;
  } catch {
    /* keep as is */
  }
  return host.replace(/^www\./, "").replace(/\.$/, "");
}

const under = (domain: string, list: string[]) => list.some((d) => domain === d || domain.endsWith(`.${d}`));
export const isJobBoard = (domain: string) => under(domain, JOB_BOARD_DOMAINS);
export const isNotAPosting = (domain: string) => under(domain, NOT_A_POSTING);

export type SearchSource = { domain: string; kind: "official" | "job_board" | "other" };
export type Evidence = { method: "submitted_url" | "web_search"; domain: string; url?: string };

/**
 * The evidence to record, or null. A posting submitted by a job-board URL needs no search. Otherwise the first web
 * source that is a job board, or that the AI judged the company's official site and is not a blog or community.
 * A submitted URL on that official site is kept as the evidence URL.
 */
export function decideEvidence(submittedUrl: string | null | undefined, sources: SearchSource[] = []): Evidence | null {
  const submitted = submittedUrl ? domainOf(submittedUrl) : null;
  if (submittedUrl && submitted && isJobBoard(submitted)) return { method: "submitted_url", domain: submitted, url: submittedUrl };
  for (const s of sources) {
    const d = domainOf(s.domain);
    if (!d.includes(".") || isNotAPosting(d)) continue;
    if (isJobBoard(d) || s.kind === "official") {
      if (submittedUrl && submitted === d) return { method: "submitted_url", domain: d, url: submittedUrl };
      return { method: "web_search", domain: d };
    }
  }
  return null;
}

/** What to do with a new posting before any paid search (POST-07, 2026-11-18). */
export type CheckPlan = "direct" | "known" | "search" | "skip";

/**
 * - direct: the posting came from a job-board address, which is evidence by itself (free)
 * - known: this (job, company) is already confirmed by earlier evidence: no search, the paid web search is never repeated
 * - search: not confirmed yet, so one web search
 * - skip: not confirmed and no AI key
 */
export function planEvidenceCheck(o: { jobBoardUrl: boolean; confirmed: boolean; aiOn: boolean }): CheckPlan {
  if (o.jobBoardUrl) return "direct";
  if (o.confirmed) return "known";
  return o.aiOn ? "search" : "skip";
}
