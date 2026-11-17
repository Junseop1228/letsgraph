// OpenDART client (server only). Retries transient failures, validates every response with Zod,
// and stops at 90% of the daily limit (specs/data-pipeline FR-OPS-02 E1-E3).
import "server-only";
import type { z } from "zod";
import {
  DART_BASE,
  DART_DAILY_LIMIT,
  DART_RETRYABLE,
  DART_STATUS,
  DART_STOP_RATIO,
  DartAccountList,
  DartCompany,
  DartFilingList,
  DartMultiAccountList,
  DART_MULTI_MAX,
  DETAIL_ANNUAL,
  REPRT_ANNUAL,
} from "@/lib/contracts/dart";
import { annualFromAccounts, parseCorpCodeXml, unzipCorpCode } from "@/lib/dart/parse";

export class DartError extends Error {
  constructor(message: string, readonly code: "no_key" | "budget" | "status" | "http" | "schema", readonly status?: string) {
    super(message);
  }
}

/** Tracks calls made today; the collector persists `used` between runs. */
export interface CallBudget {
  used: number;
  limit: number;
}

type Fetch = typeof fetch;

export class DartClient {
  constructor(
    private readonly key: string,
    private readonly budget: CallBudget = { used: 0, limit: DART_DAILY_LIMIT },
    private readonly fetchImpl: Fetch = fetch,
    private readonly retries = 2,
  ) {}

  static fromEnv(budget?: CallBudget): DartClient {
    const key = process.env.DART_API_KEY;
    if (!key) throw new DartError("DART_API_KEY is not set", "no_key");
    return new DartClient(key, budget);
  }

  get callsUsed() {
    return this.budget.used;
  }

  private checkBudget() {
    if (this.budget.used >= Math.floor(this.budget.limit * DART_STOP_RATIO)) {
      throw new DartError("daily call budget reached, defer to next run", "budget");
    }
  }

  private async raw(path: string, params: Record<string, string>): Promise<Response> {
    this.checkBudget();
    const url = new URL(`${DART_BASE}/${path}`);
    url.searchParams.set("crtfc_key", this.key);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    let last: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      this.budget.used++;
      try {
        const res = await this.fetchImpl(url, { cache: "no-store" });
        if (res.ok) return res;
        last = new DartError(`HTTP ${res.status}`, "http");
      } catch (e) {
        last = e;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    throw last instanceof Error ? last : new DartError("request failed", "http");
  }

  private async json<T extends z.ZodTypeAny>(path: string, params: Record<string, string>, schema: T): Promise<z.infer<T> | null> {
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const res = await this.raw(path, params);
      const body = await res.json();
      const status = String((body as { status?: string }).status ?? "");
      if (status === DART_STATUS.noData) return null;
      if (DART_RETRYABLE.has(status) && attempt < this.retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      if (status !== DART_STATUS.ok) throw new DartError(String((body as { message?: string }).message ?? "DART error"), "status", status);
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new DartError(parsed.error.message, "schema");
      return parsed.data;
    }
    return null;
  }

  /** 기업개황 */
  company(corpCode: string) {
    return this.json("company.json", { corp_code: corpCode }, DartCompany);
  }

  /** 사업보고서 filings of one company between two dates (YYYYMMDD) */
  annualReports(corpCode: string, bgnDe: string, endDe: string) {
    return this.json(
      "list.json",
      { corp_code: corpCode, bgn_de: bgnDe, end_de: endDe, pblntf_ty: "A", pblntf_detail_ty: "A001", page_count: "100" },
      DartFilingList,
    );
  }

  /**
   * One page (100) of final 사업보고서 filings of every company in a window (YYYYMMDD; at most 3 months
   * without corp_code). Corrected reports appear once, as their latest version (last_reprt_at=Y).
   */
  annualFilingsPage(bgnDe: string, endDe: string, page: number) {
    return this.json(
      "list.json",
      {
        bgn_de: bgnDe,
        end_de: endDe,
        pblntf_ty: "A",
        pblntf_detail_ty: DETAIL_ANNUAL,
        last_reprt_at: "Y",
        page_count: "100",
        page_no: String(page),
      },
      DartFilingList,
    );
  }

  /** 다중회사 주요계정: up to 100 companies, 연결·별도, 당기·전기·전전기 in one call */
  multiAccounts(corpCodes: string[], year: number) {
    if (corpCodes.length > DART_MULTI_MAX) throw new DartError(`at most ${DART_MULTI_MAX} corp codes per call`, "status", "021");
    return this.json(
      "fnlttMultiAcnt.json",
      { corp_code: corpCodes.join(","), bsns_year: String(year), reprt_code: REPRT_ANNUAL },
      DartMultiAccountList,
    );
  }

  /** Revenue and operating income for one fiscal year (연결 first, 별도 if no consolidated statements) */
  async annualFigures(corpCode: string, year: number) {
    for (const fsDiv of ["CFS", "OFS"] as const) {
      const list = await this.json(
        "fnlttSinglAcntAll.json",
        { corp_code: corpCode, bsns_year: String(year), reprt_code: REPRT_ANNUAL, fs_div: fsDiv },
        DartAccountList,
      );
      const fig = list ? annualFromAccounts(list.list, corpCode, year, fsDiv) : null;
      if (fig) return fig;
    }
    return null;
  }

  /** Recent filings of one company of one disclosure type (B3, lib/dart/updates.ts): A 정기, B 주요사항, I 거래소. One call. */
  filingsOfType(corpCode: string, type: "A" | "B" | "I", bgnDe: string, endDe: string) {
    return this.json(
      "list.json",
      { corp_code: corpCode, bgn_de: bgnDe, end_de: endDe, pblntf_ty: type, last_reprt_at: "Y", page_count: "100" },
      DartFilingList,
    );
  }

  /** 공시서류원본파일: the filing as a zip of XML documents (B1/B2 input, lib/dart/document.ts). One call. */
  async document(rceptNo: string): Promise<Uint8Array> {
    const res = await this.raw("document.xml", { rcept_no: rceptNo });
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
      // not a zip: DART answers errors (no file, key, limit) as a small XML or JSON body with a status code
      const body = new TextDecoder().decode(buf.slice(0, 400));
      const status = body.match(/<status>(\d+)<\/status>|"status"\s*:\s*"(\d+)"/);
      throw new DartError(`document.xml: ${body.replace(/\s+/g, " ").slice(0, 160)}`, "status", status?.[1] ?? status?.[2]);
    }
    return buf;
  }

  /** Full company list (corpCode.xml zip) */
  async corpCodes() {
    const res = await this.raw("corpCode.xml", {});
    const buf = new Uint8Array(await res.arrayBuffer());
    return parseCorpCodeXml(unzipCorpCode(buf));
  }
}
