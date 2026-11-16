// Pure DART parsing/normalisation (no network). Unit-tested.
import { XMLParser } from "fast-xml-parser";
import { unzipSync, strFromU8 } from "fflate";
import {
  DartCorpCode,
  type AnnualFigures,
  type DartAccountRow,
  type DartFiling,
  type DartMultiAccountRow,
} from "@/lib/contracts/dart";

/** "1,234,567" | "-1234" | "" | "-" -> number of won, or null */
export function parseWon(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).replace(/,/g, "").trim();
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** won -> 억원 (rounded) */
export function wonToEok(won: number | null): number | null {
  return won == null ? null : Math.round(won / 1e8);
}

const REVENUE_IDS = ["ifrs-full_Revenue", "ifrs_Revenue", "dart_Revenue"];
const REVENUE_NAMES = ["매출액", "수익(매출액)", "영업수익", "매출", "수익"];
const OP_IDS = ["dart_OperatingIncomeLoss", "ifrs-full_ProfitLossFromOperatingActivities"];
const OP_NAMES = ["영업이익", "영업이익(손실)", "영업손익"];

function pick(rows: DartAccountRow[], ids: string[], names: string[]): DartAccountRow | undefined {
  const income = rows.filter((r) => r.sj_div === "IS" || r.sj_div === "CIS");
  return (
    income.find((r) => ids.includes(r.account_id)) ??
    income.find((r) => names.includes(r.account_nm.replace(/\s/g, "")))
  );
}

/** Revenue and operating income of the current term from a fnlttSinglAcntAll list. */
export function annualFromAccounts(
  rows: DartAccountRow[],
  corpCode: string,
  year: number,
  fsDiv: "CFS" | "OFS",
): AnnualFigures | null {
  if (!rows.length) return null;
  const rev = pick(rows, REVENUE_IDS, REVENUE_NAMES);
  const op = pick(rows, OP_IDS, OP_NAMES);
  if (!rev && !op) return null;
  return {
    corpCode,
    year,
    fsDiv,
    revenue: wonToEok(parseWon(rev?.thstrm_amount)),
    operatingIncome: wonToEok(parseWon(op?.thstrm_amount)),
    rceptNo: (rev ?? op)!.rcept_no,
  };
}

/** Parse CORPCODE.xml text into validated entries (invalid rows are skipped and counted). */
export function parseCorpCodeXml(xml: string): { items: DartCorpCode[]; skipped: number } {
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });
  const doc = parser.parse(xml) as { result?: { list?: unknown } };
  const raw = doc.result?.list;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const items: DartCorpCode[] = [];
  let skipped = 0;
  for (const r of list) {
    const parsed = DartCorpCode.safeParse(r);
    if (parsed.success) items.push(parsed.data);
    else skipped++;
  }
  return { items, skipped };
}

/** corpCode.xml endpoint returns a zip with CORPCODE.xml inside. */
export function unzipCorpCode(zip: Uint8Array): string {
  const files = unzipSync(zip);
  const name = Object.keys(files).find((n) => n.toUpperCase().endsWith(".XML"));
  if (!name) throw new Error("CORPCODE.xml not found in zip");
  return strFromU8(files[name]);
}

/** Listed companies only (stock_code present), the default company universe filter before filings are checked. */
export function listedOnly(items: DartCorpCode[]): DartCorpCode[] {
  return items.filter((i) => /^\d{6}$/.test(i.stock_code.trim()));
}

/** "20260209" -> "2026-02-09" */
export function dartDate(d: string): string {
  return /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
}

/** "[기재정정]사업보고서 (2025.12)" -> { year: 2025, month: 12 }: the fiscal period the report covers */
export function fiscalPeriod(reportNm: string): { year: number; month: number } | null {
  const m = /\((\d{4})\.(\d{2})\)/.exec(reportNm);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

/**
 * Filers that are investment vehicles rather than operating employers (SPAC, REIT, ship / infrastructure funds).
 * They file 사업보고서 but have no business to explore or jobs to link (PROPOSED 2026-11-17, data session).
 */
const NON_EMPLOYER = /기업인수목적|스팩|부동산투자회사|리츠$|선박투자회사|투융자회사/;
export function isNonEmployer(name: string): boolean {
  return NON_EMPLOYER.test(name.replace(/\s/g, ""));
}

/** One filing per company: the latest final 사업보고서 (rcept_no starts with the filing date, so it sorts by time). */
export function latestByCompany(filings: DartFiling[]): DartFiling[] {
  const byCorp = new Map<string, DartFiling>();
  for (const f of filings) {
    const cur = byCorp.get(f.corp_code);
    if (!cur || f.rcept_no > cur.rcept_no) byCorp.set(f.corp_code, f);
  }
  return [...byCorp.values()];
}

/** YYYYMMDD windows of at most `months` months covering [from, to] (list.json limit without corp_code). */
export function dateWindows(from: Date, to: Date, months = 3): [string, string][] {
  const ymd = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const out: [string, string][] = [];
  let start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (start <= end) {
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
    const last = new Date(Math.min(next.getTime() - 86_400_000, end.getTime()));
    out.push([ymd(start), ymd(last)]);
    start = next;
  }
  return out;
}

const MULTI_REVENUE = ["매출액", "수익(매출액)", "영업수익", "매출"];
const MULTI_OP = ["영업이익", "영업이익(손실)", "영업손익"];

/**
 * Up to 3 fiscal years (당기 = year, 전기, 전전기) x 연결/별도 of one company from fnlttMultiAcnt rows (억원).
 * A year/basis with neither figure is left out.
 */
export function figuresFromMulti(rows: DartMultiAccountRow[], corpCode: string, year: number): AnnualFigures[] {
  const out: AnnualFigures[] = [];
  const mine = rows.filter((r) => r.corp_code === corpCode && (r.sj_div === "IS" || r.sj_div === "CIS"));
  for (const fsDiv of ["CFS", "OFS"] as const) {
    const sheet = mine.filter((r) => r.fs_div === fsDiv);
    const find = (names: string[]) => sheet.find((r) => names.includes(r.account_nm.replace(/\s/g, "")));
    const rev = find(MULTI_REVENUE);
    const op = find(MULTI_OP);
    if (!rev && !op) continue;
    const terms = ["thstrm_amount", "frmtrm_amount", "bfefrmtrm_amount"] as const;
    terms.forEach((term, back) => {
      const revenue = wonToEok(parseWon(rev?.[term]));
      const operatingIncome = wonToEok(parseWon(op?.[term]));
      if (revenue == null && operatingIncome == null) return;
      out.push({ corpCode, year: year - back, fsDiv, revenue, operatingIncome, rceptNo: (rev ?? op)!.rcept_no });
    });
  }
  return out;
}

/** "(주)CJ 제일제당" / "주식회사 CJ제일제당" -> "cj제일제당": the key used to match a company name to DART. */
export function normalizeCorpName(s: string): string {
  return s.replace(/\(주\)|㈜|주식회사|\s/g, "").toLowerCase();
}

export type CorpMatch = { ok: true; item: DartCorpCode } | { ok: false; reason: string };

/**
 * Finds the DART entry for a company name (exact name after normalising). Listed companies win over unlisted ones
 * with the same name; anything still ambiguous is refused rather than guessed (specs/data-pipeline FR-OPS-02).
 */
export function findCorpCode(items: DartCorpCode[], name: string): CorpMatch {
  const key = normalizeCorpName(name);
  const same = items.filter((i) => normalizeCorpName(i.corp_name) === key);
  const listed = same.filter((i) => /^\d{6}$/.test(i.stock_code.trim()));
  const pool = listed.length ? listed : same;
  if (pool.length === 1) return { ok: true, item: pool[0] };
  if (!pool.length) return { ok: false, reason: `DART에서 '${name}'과 이름이 같은 회사를 찾지 못함` };
  return { ok: false, reason: `DART에 '${name}' 이름의 회사가 ${pool.length}곳이라 고르지 않음` };
}