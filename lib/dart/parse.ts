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
