// B1 + B2 for one company or a batch (specs/data-pipeline FR-OPS-03): 사업보고서 원문 -> "II. 사업의 내용" ->
// one AI call -> checked rows -> business_segments, segment_job_roles, segment_details, company_details,
// companies.has_detail. Runs with the server key. Scope C (D 2026-11-17 19:14): the batch covers the core set,
// every other company is made on first view (app/(main)/company/[id]/actions.ts).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DartClient } from "@/lib/dart/client";
import { businessParts, mainDocument, promptText } from "@/lib/dart/document";
import { companyTrend, toSegmentRows } from "@/lib/dart/segments";
import { extractSegments } from "@/lib/ai/segments";
import { SEGMENTS_PROMPT_VERSION } from "@/lib/ai/prompts/segments";
import { JOBS } from "@/lib/reference/jobs";
import { JOB_INDUSTRY } from "@/lib/reference/job-industry";
import { PER_INDUSTRY } from "@/lib/explore/stars";

/**
 * Token budget (D 2026-11-17 20:02, Claude's call): about 30k characters of the chapter per company (parts on
 * products and sales first). Measured on the first runs and reported in context/status.md.
 */
export const REPORT_MAX_CHARS = 30_000;
/** gemini-3.5-flash-lite list price (USD per 1M tokens; output includes thinking), for the batch's spend guard */
export const PRICE_IN = 0.3;
export const PRICE_OUT = 2.5;

export type Usage = { inputTokens: number; outputTokens: number };
export type AnalyzeResult = {
  companyId: string;
  status: "ok" | "skipped" | "failed";
  reason?: string;
  segments?: number;
  usage?: Usage;
  chars?: number;
};

export const usd = (u: Usage) => (u.inputTokens * PRICE_IN + u.outputTokens * PRICE_OUT) / 1e6;

const isoDay = (rceptNo: string) => `${rceptNo.slice(0, 4)}-${rceptNo.slice(4, 6)}-${rceptNo.slice(6, 8)}`;

export async function analyzeCompany(db: SupabaseClient, dart: DartClient, companyId: string, opts: { force?: boolean; maxChars?: number } = {}): Promise<AnalyzeResult> {
  const { data: co } = await db.from("companies").select("id,name,corp_code,industry_id,industries(name)").eq("id", companyId).maybeSingle();
  if (!co) return { companyId, status: "failed", reason: "unknown company" };
  // hand-made (seed) rows have no 사업보고서 접수번호 (the seed leaves ai_generated at its default): never touched
  const { data: existing } = await db.from("business_segments").select("id,ai_generated,source_rcept_no").eq("company_id", companyId);
  if ((existing ?? []).some((s) => !s.ai_generated || !s.source_rcept_no)) return { companyId, status: "skipped", reason: "hand-made data" };
  if ((existing ?? []).length && !opts.force) return { companyId, status: "skipped", reason: "done" };

  const { data: fin } = await db.from("company_financials").select("year,fs_div,revenue,operating_income,rcept_no").eq("company_id", companyId).order("year", { ascending: false });
  const latest = (fin ?? [])[0];
  if (!latest?.rcept_no) return { companyId, status: "failed", reason: "no annual report" };
  const year = latest.year as number;
  const rev = (fin ?? []).filter((r) => r.year === year);
  const companyRevenue = (rev.find((r) => r.fs_div === "CFS")?.revenue ?? rev.find((r) => r.fs_div === "OFS")?.revenue ?? null) as number | null;

  let report: string;
  try {
    const parts = businessParts(mainDocument(await dart.document(latest.rcept_no), latest.rcept_no));
    report = promptText(parts, opts.maxChars ?? REPORT_MAX_CHARS);
  } catch (e) {
    return { companyId, status: "failed", reason: `document: ${String((e as Error).message ?? e).slice(0, 120)}` };
  }
  if (report.length < 200) return { companyId, status: "failed", reason: "no business chapter" };

  const industry = String(co.industry_id ?? "");
  const related = JOBS.filter((j) => JOB_INDUSTRY[j.id]?.[industry]);
  const jobs = (related.length ? related : JOBS).map((j) => ({ id: j.id, name: j.name }));
  const industryName = (co.industries as { name?: string } | null)?.name ?? industry;

  let call;
  try {
    call = await extractSegments({ company: co.name, industry: industryName, fiscalYear: year, jobs, report });
  } catch (e) {
    return { companyId, status: "failed", reason: `ai: ${String((e as Error).message ?? e).slice(0, 120)}`, chars: report.length };
  }
  const mapped = toSegmentRows(call.output, {
    companyId,
    companyName: co.name,
    rceptNo: latest.rcept_no,
    filedOn: isoDay(latest.rcept_no),
    companyRevenue,
    allowedJobs: jobs.map((j) => j.id),
  });
  if (!mapped.ok) return { companyId, status: "failed", reason: mapped.reason, usage: call.usage, chars: report.length };

  // replace this company's AI rows (cascade removes their details and job rows), then write the new ones
  if ((existing ?? []).length) await db.from("business_segments").delete().eq("company_id", companyId).eq("ai_generated", true).not("source_rcept_no", "is", null);
  const w1 = await db.from("business_segments").insert(mapped.rows.segments);
  if (w1.error) return { companyId, status: "failed", reason: `db segments: ${w1.error.message}`, usage: call.usage };
  const w2 = await db.from("segment_details").insert(mapped.rows.details);
  if (w2.error) return { companyId, status: "failed", reason: `db details: ${w2.error.message}`, usage: call.usage };
  if (mapped.rows.jobs.length) await db.from("segment_job_roles").upsert(mapped.rows.jobs, { onConflict: "segment_id,job_role_id", ignoreDuplicates: true });

  const trend = companyTrend((fin ?? []) as Parameters<typeof companyTrend>[0]);
  await db.from("company_details").upsert({
    company_id: companyId,
    trend: trend.points,
    trend_source: { kind: "filing", label: `DART 사업보고서 (${trend.basis === "OFS" ? "별도" : "연결"})`, date: isoDay(latest.rcept_no) },
    news_query: co.name,
  });
  await db.from("companies").update({ has_detail: true }).eq("id", companyId);
  return { companyId, status: "ok", segments: mapped.rows.segments.length, usage: call.usage, chars: report.length };
}

/**
 * The core set (scope C): companies the graph shows by default (top PER_INDUSTRY by revenue in every industry),
 * watched companies and companies of uploaded postings. Reviewed companies only, without hand-made data.
 */
export async function coreSet(db: SupabaseClient): Promise<string[]> {
  const { data: inds } = await db.from("industries").select("id");
  const ids = new Set<string>();
  for (const { id } of inds ?? []) {
    const { data } = await db
      .from("companies")
      .select("id")
      .eq("industry_reviewed", true)
      .eq("industry_id", id)
      .not("revenue", "is", null)
      .order("revenue", { ascending: false })
      .limit(PER_INDUSTRY);
    for (const r of data ?? []) ids.add(r.id);
  }
  const { data: watched } = await db.from("watched_companies").select("company_id").limit(1000);
  for (const r of watched ?? []) ids.add(r.company_id);
  const { data: posted } = await db.from("job_postings").select("company_id").not("company_id", "is", null).limit(1000);
  for (const r of posted ?? []) if (r.company_id) ids.add(r.company_id);
  return [...ids];
}

export type BatchResult = { runId: number | null; results: AnalyzeResult[]; spentUsd: number; stoppedForBudget: boolean; promptVersion: string };

/** Runs the batch with a few calls at a time; stops starting new companies once the spend reaches budgetUsd. */
export async function analyzeMany(
  db: SupabaseClient,
  dart: DartClient,
  ids: string[],
  o: { concurrency?: number; budgetUsd: number; force?: boolean; source?: string },
): Promise<BatchResult> {
  const { data: run } = await db.from("collector_runs").insert({ source: o.source ?? "segments", note: `${SEGMENTS_PROMPT_VERSION} · ${ids.length} companies` }).select("id").single();
  const results: AnalyzeResult[] = [];
  let spent = 0;
  let stopped = false;
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      if (spent >= o.budgetUsd) {
        stopped = true;
        return;
      }
      const id = ids[next++];
      const r = await analyzeCompany(db, dart, id, { force: o.force });
      if (r.usage) spent += usd(r.usage);
      results.push(r);
      if (r.status === "failed" && run) await db.from("collector_failures").insert({ run_id: run.id, target: id, reason: r.reason ?? "failed" });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, o.concurrency ?? 3) }, worker));
  if (run)
    await db
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        ok_count: results.filter((r) => r.status === "ok").length,
        fail_count: results.filter((r) => r.status === "failed").length,
        calls_used: dart.callsUsed,
        deferred: stopped,
        note: `${SEGMENTS_PROMPT_VERSION} · ${ids.length} companies · USD ${spent.toFixed(3)}`,
      })
      .eq("id", run.id);
  return { runId: run?.id ?? null, results, spentUsd: Number(spent.toFixed(4)), stoppedForBudget: stopped, promptVersion: SEGMENTS_PROMPT_VERSION };
}
