// B3 기업 소식 (specs/company FR-CORP-02, specs/explore FR-DISC-04): recent DART filings of a company -> the ones a
// job seeker cares about -> rows for company_updates (title as filed, date, link to the DART viewer, segment tag).
// Pure, unit-tested; the AI only picks the segment (lib/ai/updates.ts).
import type { DartFiling } from "@/lib/contracts/dart";

/** filings per company kept on the page and in the bell */
export const UPDATES_MAX = 8;
/** look-back window in days */
export const UPDATES_DAYS = 120;

/** Routine ownership and governance filings that say nothing about the business. */
const NOISE = [
  /임원\s*ㆍ?\s*주요주주/,
  /주식등의\s*대량보유/,
  /최대주주등\s*소유주식/,
  /특수관계인/,
  /자기주식/,
  /주주총회\s*소집/,
  /소속부서\s*변경|대표이사\s*변경|사외이사/,
  /증권\s*발행\s*실적/,
  /결산실적공시\s*예고/,
  /투자설명서|증권신고서/,
  /대규모기업집단/,
  /최대주주\s*변경/,
  /주식소각/,
  /주주명부\s*폐쇄/,
  /수시공시의무\s*관련/,
];

export function isNoise(title: string): boolean {
  return NOISE.some((r) => r.test(title));
}

/** "[기재정정]단일판매ㆍ공급계약체결" -> "단일판매·공급계약체결 (정정)": shorter, readable, same meaning */
export function cleanTitle(reportNm: string): string {
  const corrected = /^\s*\[(기재|첨부|발행조건)?정정\]/.test(reportNm);
  const t = reportNm
    .replace(/^\s*\[[^\]]*\]\s*/, "")
    .replace(/ㆍ/g, "·")
    .replace(/\s+/g, " ")
    .trim();
  return corrected ? `${t} (정정)` : t;
}

const iso = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

export type Picked = { rceptNo: string; title: string; date: string; kind: "disclosure" | "ir" };

/** Newest first, noise and repeats of the same title removed (a correction replaces the original), at most UPDATES_MAX. */
export function pickFilings(filings: DartFiling[], max = UPDATES_MAX): Picked[] {
  const seen = new Set<string>();
  const out: Picked[] = [];
  for (const f of [...filings].sort((a, b) => b.rcept_no.localeCompare(a.rcept_no))) {
    if (isNoise(f.report_nm)) continue;
    const title = cleanTitle(f.report_nm);
    const key = title.replace(/ \(정정\)$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ rceptNo: f.rcept_no, title, date: iso(f.rcept_dt), kind: /기업설명회|IR/.test(title) ? "ir" : "disclosure" });
    if (out.length >= max) break;
  }
  return out;
}

export type UpdateRow = {
  company_id: string;
  segment_id: string | null;
  tag: string;
  title: string;
  date: string;
  kind: "disclosure" | "ir";
  source_label: string;
  rcept_no: string;
};

/** Rows for company_updates. tags[i] = segment id the AI picked for picked[i], or null (= 전사). Unknown ids -> 전사. */
export function toUpdateRows(companyId: string, picked: Picked[], segments: { id: string; shortName: string }[], tags: (string | null)[]): UpdateRow[] {
  return picked.map((p, i) => {
    const seg = segments.find((s) => s.id === tags[i]) ?? null;
    return {
      company_id: companyId,
      segment_id: seg?.id ?? null,
      tag: seg ? seg.shortName.slice(0, 6) : "전사",
      title: p.title.slice(0, 200),
      date: p.date,
      kind: p.kind,
      source_label: p.kind === "ir" ? "DART 공시 (IR)" : "DART 공시",
      rcept_no: p.rceptNo,
    };
  });
}

/** The DART viewer page of one filing (outbound link; the filing itself is not copied). */
export const dartViewerUrl = (rceptNo: string) => `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
