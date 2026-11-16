// Pure DART parsing/normalisation (no network). Unit-tested.
import { XMLParser } from "fast-xml-parser";
import { unzipSync, strFromU8 } from "fflate";
import { DartCorpCode, type AnnualFigures, type DartAccountRow } from "@/lib/contracts/dart";

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