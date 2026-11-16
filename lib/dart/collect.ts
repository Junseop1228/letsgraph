// DART 수집 (specs/data-pipeline FR-OPS-02): companies in the DB -> 기업개황 + 최근 사업연도 재무제표 -> DB.
// Manual trigger for now (POST /api/dev/dart-sync). A scheduled run (pg_cron + Edge Function, AGENTS.md) comes later.
//
// - Companies without a DART 고유번호 get one by exact name from corpCode.xml (one call for all of them).
// - Yearly figures always go to company_financials (연결 first, 별도 if no consolidated statements; NFR-DOM-01).
// - The headline figures on companies are only filled when empty or previously filled by this collector:
//   hand-reviewed figures with their own basis (e.g. CJ제일제당 "대한통운 제외") are kept.
// - Failures are recorded per company and never erase stored data (E1, E3); the run stops at 90% of the daily limit (E2).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnnualFigures } from "@/lib/contracts/dart";
import { DartError, type DartClient } from "@/lib/dart/client";
import { dartDate, findCorpCode } from "@/lib/dart/parse";

export type DartSyncOptions = {
  /** how many recent fiscal years to fetch (1-5) */
  years: number;
  /** company names to add from DART (exact names, e.g. "삼성전자") */
  add: string[];
};

export type DartSyncResult = {
  runId: number | null;
  ok: number;
  failed: number;
  callsUsed: number;
  deferred: boolean;
  added: string[];
  failures: { target: string; reason: string }[];
};

type Row = { id: string; name: string; corp_code: string | null; revenue: number | null; source_label: string | null };

const COLLECTOR_LABEL = "DART "; // source_label prefix written by this collector

export async function syncDart(db: SupabaseClient, client: DartClient, opts: DartSyncOptions): Promise<DartSyncResult> {
  const run = await db.from("collector_runs").insert({ source: "dart" }).select("id").single();
  const runId: number | null = run.data?.id ?? null;
  const failures: { target: string; reason: string }[] = [];
  const fail = (target: string, reason: string) => failures.push({ target, reason: reason.slice(0, 300) });
  const added: string[] = [];
  let ok = 0;
  let deferred = false;

  try {
    const { data, error } = await db.from("companies").select("id, name, corp_code, revenue, source_label");
    if (error) throw new Error(error.message);
    const companies = (data ?? []) as Row[];

    // DART 고유번호: one corpCode.xml download covers every company still missing one and every name to add
    const missing = companies.filter((c) => !c.corp_code);
    if (missing.length || opts.add.length) {
      const { items } = await client.corpCodes();
      for (const c of missing) {
        const m = findCorpCode(items, c.name);
        if (m.ok) c.corp_code = m.item.corp_code;
        else fail(c.name, m.reason);
      }
      for (const name of opts.add) {
        const m = findCorpCode(items, name);
        if (!m.ok) {
          fail(name, m.reason);
          continue;
        }
        if (companies.some((c) => c.corp_code === m.item.corp_code)) continue; // already in the catalogue
        const id = `dart-${m.item.corp_code}`;
        // industry_reviewed stays false: the company is hidden from industry views until a person assigns it (FR-OPS-01)
        const ins = await db
          .from("companies")
          .upsert({ id, corp_code: m.item.corp_code, name: m.item.corp_name, stock_code: m.item.stock_code.trim() || null, industry_reviewed: false });
        if (ins.error) {
          fail(name, ins.error.message);
          continue;
        }
        companies.push({ id, name: m.item.corp_name, corp_code: m.item.corp_code, revenue: null, source_label: null });
        added.push(m.item.corp_name);
      }
    }

    // 사업보고서 for fiscal year N is filed by the end of March of N+1
    const now = new Date();
    const lastYear = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;

    for (const c of companies) {
      if (!c.corp_code) continue;
      try {
        const info = await client.company(c.corp_code);
        if (!info) {
          fail(c.corp_code, `${c.name}: 기업개황 없음`);
          continue;
        }
        const figures: AnnualFigures[] = [];
        for (let y = lastYear; y > lastYear - opts.years; y--) {
          const f = await client.annualFigures(c.corp_code, y);
          if (f) figures.push(f);
        }
        const collectedAt = new Date().toISOString();
        if (figures.length) {
          const up = await db.from("company_financials").upsert(
            figures.map((f) => ({
              company_id: c.id, year: f.year, fs_div: f.fsDiv, revenue: f.revenue, operating_income: f.operatingIncome,
              rcept_no: f.rceptNo, collected_at: collectedAt,
            })),
          );
          if (up.error) throw new Error(up.error.message);
        }
        const latest = figures[0]; // newest year first
        const replaceHeadline = latest && (c.revenue == null || (c.source_label ?? "").startsWith(COLLECTOR_LABEL));
        const upd = await db
          .from("companies")
          .update({
            corp_code: c.corp_code,
            stock_code: info.stock_code.trim() || null,
            bizr_no: info.bizr_no.trim() || null,
            induty_code: info.induty_code.trim() || null,
            collected_at: collectedAt,
            ...(replaceHeadline
              ? {
                  revenue: latest.revenue,
                  operating_income: latest.operatingIncome,
                  fiscal_year: latest.year,
                  basis_note: latest.fsDiv === "CFS" ? "연결" : "별도",
                  source_kind: "filing",
                  source_label: `${COLLECTOR_LABEL}${latest.year} 사업보고서`,
                  source_date: dartDate(latest.rceptNo.slice(0, 8)), // 접수번호 starts with the filing date
                }
              : {}),
          })
          .eq("id", c.id);
        if (upd.error) throw new Error(upd.error.message);
        if (!latest) fail(c.corp_code, `${c.name}: 최근 ${opts.years}개 사업연도 재무제표 없음`);
        ok++;
      } catch (e) {
        if (e instanceof DartError && e.code === "budget") {
          deferred = true; // E2: the rest waits for the next run
          break;
        }
        fail(c.corp_code, `${c.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    if (e instanceof DartError && e.code === "budget") deferred = true;
    else fail("run", e instanceof Error ? e.message : String(e));
  }

  if (runId != null) {
    if (failures.length) await db.from("collector_failures").insert(failures.map((f) => ({ run_id: runId, ...f })));
    await db
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        ok_count: ok,
        fail_count: failures.length,
        calls_used: client.callsUsed,
        deferred,
        note: added.length ? `added: ${added.join(", ")}` : null,
      })
      .eq("id", runId);
  }
  return { runId, ok, failed: failures.length, callsUsed: client.callsUsed, deferred, added, failures };
}
