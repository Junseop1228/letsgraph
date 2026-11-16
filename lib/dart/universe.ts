// DART 기업 범위 수집 (specs/data-pipeline FR-OPS-02; D 2026-11-09 DATA ARCHITECTURE (1)): every company that filed a
// 사업보고서 in the look-back window -> companies + 기업개황 (사업자등록번호, 업종 코드) + 매출·영업이익 per fiscal year.
//
// - New companies are staging rows: industry_reviewed = false and empty headline figures, so they stay out of every
//   list, search and graph until a person assigns the industry (FR-OPS-01; repo reads filter industry_reviewed).
// - Existing rows (matched by corp_code) keep their id, name, industry, review flag and figures; only empty DART
//   fields (사업자등록번호, 업종 코드, 종목코드) are filled.
// - Financials: one fnlttMultiAcnt call covers 100 companies and 3 fiscal years (당기·전기·전전기) for 연결 and 별도;
//   companies it does not cover get one fnlttSinglAcntAll try for the latest year.
// - Investment vehicles (SPAC, REIT, ship / infra funds) are skipped (isNonEmployer).
// - Failures are recorded per target and never erase stored data; the run stops at 90% of the daily limit (E2).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DART_LIST_WINDOW_MONTHS, DART_MULTI_MAX, type AnnualFigures, type DartFiling } from "@/lib/contracts/dart";
import { DartError, type DartClient } from "@/lib/dart/client";
import { dateWindows, figuresFromMulti, fiscalPeriod, isNonEmployer, latestByCompany } from "@/lib/dart/parse";

export type UniverseOptions = {
  /** look-back window for 사업보고서 filings, in months (1-12) */
  months: number;
  /** fetch 기업개황 for companies still missing 사업자등록번호 or 업종 코드 */
  info: boolean;
  /** fetch 매출·영업이익 (3 fiscal years) */
  financials: boolean;
  /** only the first N filers (trial runs) */
  limit?: number;
  /** call DART but write nothing */
  dryRun?: boolean;
};

export type UniverseResult = {
  runId: number | null;
  filers: number;
  skippedVehicles: number;
  added: number;
  updated: number;
  infoFetched: number;
  financialRows: number;
  companiesWithFinancials: number;
  callsUsed: number;
  deferred: boolean;
  failed: number;
  failures: { target: string; reason: string }[];
};

type Existing = { id: string; corp_code: string | null; bizr_no: string | null; induty_code: string | null; stock_code: string | null };
type Info = { bizr_no: string; induty_code: string; stock_code: string };

const PAGE = 1000; // PostgREST returns at most 1000 rows per request
const WRITE_CHUNK = 500;
const GAP_MS = 120; // at most ~8 DART calls per second across workers
const WORKERS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const isBudget = (e: unknown) => e instanceof DartError && e.code === "budget";

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** Runs fn over items with a few workers, starting calls at least GAP_MS apart. */
async function pool<T>(items: T[], fn: (item: T) => Promise<void>) {
  let next = 0;
  let lastStart = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      const slot = Math.max(Date.now(), lastStart + GAP_MS);
      lastStart = slot;
      const wait = slot - Date.now();
      if (wait > 0) await sleep(wait);
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
}

export async function collectUniverse(db: SupabaseClient, client: DartClient, opts: UniverseOptions): Promise<UniverseResult> {
  const write = !opts.dryRun;
  const run = write ? await db.from("collector_runs").insert({ source: "dart-universe" }).select("id").single() : null;
  const runId: number | null = run?.data?.id ?? null;
  const failures: { target: string; reason: string }[] = [];
  const fail = (target: string, reason: string): void => void failures.push({ target, reason: reason.slice(0, 300) });
  const r: UniverseResult = {
    runId,
    filers: 0,
    skippedVehicles: 0,
    added: 0,
    updated: 0,
    infoFetched: 0,
    financialRows: 0,
    companiesWithFinancials: 0,
    callsUsed: 0,
    deferred: false,
    failed: 0,
    failures: [],
  };

  try {
    // 1. 사업보고서 filers in the window (KST calendar dates)
    const today = new Date(Date.now() + 9 * 3_600_000);
    const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - opts.months, today.getUTCDate() + 1));
    const filings: DartFiling[] = [];
    for (const [bgn, end] of dateWindows(from, today, DART_LIST_WINDOW_MONTHS)) {
      for (let page = 1; ; page++) {
        const res = await client.annualFilingsPage(bgn, end, page);
        if (!res) break;
        filings.push(...res.list);
        if (!res.total_page || page >= res.total_page) break;
        await sleep(GAP_MS);
      }
    }
    const latest = latestByCompany(filings);
    let targets = latest.filter((f) => !isNonEmployer(f.corp_name));
    r.skippedVehicles = latest.length - targets.length;
    targets.sort((a, b) => a.corp_code.localeCompare(b.corp_code));
    if (opts.limit) targets = targets.slice(0, opts.limit);
    r.filers = targets.length;

    // 2. rows already in the DB, by DART 고유번호
    const existing = await readAll<Existing>((a, b) =>
      db.from("companies").select("id, corp_code, bizr_no, induty_code, stock_code").range(a, b),
    );
    const byCorp = new Map(existing.filter((e) => e.corp_code).map((e) => [e.corp_code as string, e]));
    const idOf = (corp: string) => byCorp.get(corp)?.id ?? `dart-${corp}`;

    // 3. 기업개황 for companies missing 사업자등록번호 or 업종 코드
    const info = new Map<string, Info>();
    if (opts.info) {
      const need = targets.filter((f) => {
        const e = byCorp.get(f.corp_code);
        return !e || !e.bizr_no || !e.induty_code;
      });
      await pool(need, async (f) => {
        if (r.deferred) return;
        try {
          const c = await client.company(f.corp_code);
          if (!c) return fail(f.corp_code, `기업개황 없음 (${f.corp_name})`);
          info.set(f.corp_code, {
            bizr_no: c.bizr_no.replace(/\D/g, ""),
            induty_code: c.induty_code.trim(),
            stock_code: c.stock_code.trim(),
          });
        } catch (e) {
          if (isBudget(e)) r.deferred = true;
          else fail(f.corp_code, `기업개황 (${f.corp_name}): ${msg(e)}`);
        }
      });
      r.infoFetched = info.size;
    }

    // 4. companies: new staging rows + empty DART fields of existing rows
    const stored = new Set<string>(targets.filter((f) => byCorp.has(f.corp_code)).map((f) => f.corp_code));
    const collectedAt = new Date().toISOString();
    const newRows = targets
      .filter((f) => !byCorp.has(f.corp_code))
      .map((f) => {
        const i = info.get(f.corp_code);
        return {
          id: idOf(f.corp_code),
          corp_code: f.corp_code,
          name: f.corp_name,
          stock_code: i?.stock_code || f.stock_code.trim() || null,
          bizr_no: i?.bizr_no || null,
          induty_code: i?.induty_code || null,
          industry_reviewed: false,
          collected_at: collectedAt,
        };
      });
    for (const chunk of chunks(newRows, WRITE_CHUNK)) {
      if (!write) break;
      const { error } = await db.from("companies").upsert(chunk, { onConflict: "id" });
      if (error) for (const row of chunk) fail(row.corp_code, `기업 저장 실패: ${error.message}`);
      else {
        r.added += chunk.length;
        for (const row of chunk) stored.add(row.corp_code);
      }
    }
    for (const f of targets) {
      const e = byCorp.get(f.corp_code);
      const i = info.get(f.corp_code);
      if (!e || !i || !write) continue;
      const patch: Record<string, string> = {};
      if (!e.bizr_no && i.bizr_no) patch.bizr_no = i.bizr_no;
      if (!e.induty_code && i.induty_code) patch.induty_code = i.induty_code;
      if (!e.stock_code && i.stock_code) patch.stock_code = i.stock_code;
      if (!Object.keys(patch).length) continue;
      const { error } = await db.from("companies").update(patch).eq("id", e.id);
      if (error) fail(f.corp_code, `기업 갱신 실패: ${error.message}`);
      else r.updated++;
    }

    // 5. 매출·영업이익: fnlttMultiAcnt per fiscal year of the report, then single-company fallback
    if (opts.financials && !r.deferred) {
      const figures: AnnualFigures[] = [];
      const covered = new Set<string>();
      const multiPass = async (groups: Map<number, string[]>) => {
        for (const [year, codes] of groups) {
          for (const chunk of chunks(codes, DART_MULTI_MAX)) {
            if (r.deferred) return;
            try {
              const res = await client.multiAccounts(chunk, year);
              for (const corp of chunk) {
                const figs = figuresFromMulti(res?.list ?? [], corp, year);
                if (figs.length) {
                  figures.push(...figs);
                  covered.add(corp);
                }
              }
            } catch (e) {
              if (isBudget(e)) r.deferred = true;
              else fail(`multi ${year} x${chunk.length}`, `주요계정: ${msg(e)}`);
            }
            await sleep(GAP_MS);
          }
        }
      };
      const period = new Map(targets.map((f) => [f.corp_code, fiscalPeriod(f.report_nm)]));
      const reportYear = (corp: string) => period.get(corp)?.year ?? today.getUTCFullYear() - 1;
      const group = (corps: string[], shift: number) => {
        const g = new Map<number, string[]>();
        for (const corp of corps) {
          const y = reportYear(corp) - shift;
          g.set(y, [...(g.get(y) ?? []), corp]);
        }
        return g;
      };
      const all = targets.map((f) => f.corp_code);
      await multiPass(group(all, 0));
      // a fiscal year that does not end in December can sit under the previous 사업연도
      await multiPass(group(all.filter((c) => !covered.has(c) && period.get(c)?.month !== 12), 1));
      const rest = all.filter((c) => !covered.has(c));
      await pool(rest, async (corp) => {
        if (r.deferred) return;
        try {
          const fig = await client.annualFigures(corp, reportYear(corp));
          if (fig) {
            figures.push(fig);
            covered.add(corp);
          } else fail(corp, "재무 수치 없음 (주요계정·전체 재무제표 모두 비어 있음)");
        } catch (e) {
          if (isBudget(e)) r.deferred = true;
          else fail(corp, `재무: ${msg(e)}`);
        }
      });

      const rows = figures
        .filter((f) => stored.has(f.corpCode) && /^\d{14}$/.test(f.rceptNo))
        .map((f) => ({
          company_id: idOf(f.corpCode),
          year: f.year,
          fs_div: f.fsDiv,
          revenue: f.revenue,
          operating_income: f.operatingIncome,
          rcept_no: f.rceptNo,
          collected_at: collectedAt,
        }));
      const unique = [...new Map(rows.map((x) => [`${x.company_id}|${x.year}|${x.fs_div}`, x])).values()];
      for (const chunk of chunks(unique, WRITE_CHUNK)) {
        if (!write) break;
        const { error } = await db.from("company_financials").upsert(chunk, { onConflict: "company_id,year,fs_div" });
        if (error) fail(`financials x${chunk.length}`, `재무 저장 실패: ${error.message}`);
        else r.financialRows += chunk.length;
      }
      r.companiesWithFinancials = new Set(figures.map((f) => f.corpCode)).size;
    }
  } catch (e) {
    if (isBudget(e)) r.deferred = true;
    else fail("run", msg(e));
  }

  r.callsUsed = client.callsUsed;
  r.failed = failures.length;
  r.failures = failures.slice(0, 30);
  if (runId != null) {
    await db
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        ok_count: r.added + r.updated,
        fail_count: failures.length,
        calls_used: r.callsUsed,
        deferred: r.deferred,
        note: `filers ${r.filers}, vehicles skipped ${r.skippedVehicles}, added ${r.added}, updated ${r.updated}, info ${r.infoFetched}, financial rows ${r.financialRows} (${r.companiesWithFinancials} companies)`,
      })
      .eq("id", runId);
    for (const chunk of chunks(failures, WRITE_CHUNK)) {
      await db.from("collector_failures").insert(chunk.map((f) => ({ run_id: runId, target: f.target, reason: f.reason })));
    }
  }
  return r;
}
