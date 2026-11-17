"use server";
// 처음 볼 때 만들기 (specs/data-pipeline FR-OPS-03 예비 경로, scope C D 2026-11-17 19:14): a reviewed DART company
// without segments gets its B1/B2 analysis the first time someone opens it. Guards: the company must be reviewed and
// have a DART code; one run per company at a time (this server); at most DAILY_CAP runs in 24 hours (spend cap,
// Claude's call under D 2026-11-17 20:02: about 0.007 USD each on gemini-3.5-flash-lite).
import { createAdminClient } from "@/lib/supabase/admin";
import { DartClient } from "@/lib/dart/client";
import { analyzeCompany, refreshUpdates } from "@/lib/dart/analyze";
import { aiEnabled } from "@/lib/ai/tasks";

const DAILY_CAP = 300;
const inFlight = new Map<string, Promise<BuildResult>>();

export type BuildResult = { ok: boolean; message?: string };

const FAILED = "사업보고서를 정리하지 못했어요. 잠시 뒤 다시 열어 주세요.";

export async function buildCompanyDetail(companyId: string): Promise<BuildResult> {
  if (process.env.DATA_SOURCE !== "supabase" || !aiEnabled() || !process.env.DART_API_KEY) return { ok: false, message: "지금은 사업부 정보를 만들 수 없어요." };
  const id = String(companyId).slice(0, 40);
  const db = createAdminClient();
  const { data: co } = await db.from("companies").select("id,industry_reviewed,corp_code,has_detail").eq("id", id).maybeSingle();
  if (!co || !co.industry_reviewed || !co.corp_code) return { ok: false, message: "이 기업은 사업부 정보를 만들 수 없어요." };
  if (co.has_detail) return { ok: true };
  // a company that failed in the last 7 days is not retried on every visit (each try costs an AI call)
  const week = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { count: failedBefore } = await db.from("collector_failures").select("id", { count: "exact", head: true }).eq("target", id).gte("created_at", week);
  if ((failedBefore ?? 0) > 0) return { ok: false, message: "이 기업의 사업보고서는 사업 부문을 나눠 정리하기 어려웠어요. 기업 개요와 재무 수치는 DART에서 볼 수 있어요." };

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db.from("collector_runs").select("id", { count: "exact", head: true }).eq("source", "segments-view").gte("started_at", since);
  if ((count ?? 0) >= DAILY_CAP) return { ok: false, message: "오늘은 새 기업 정리를 더 할 수 없어요. 내일 다시 열어 주세요." };

  let p = inFlight.get(id);
  if (!p) {
    p = run(id).finally(() => inFlight.delete(id));
    inFlight.set(id, p);
  }
  return p;
}

async function run(companyId: string): Promise<BuildResult> {
  const db = createAdminClient();
  const { data: row } = await db.from("collector_runs").insert({ source: "segments-view", note: companyId }).select("id").single();
  const dart = DartClient.fromEnv();
  const r = await analyzeCompany(db, dart, companyId);
  // B3 with it: the company's recent filings, tagged to the new segments (3 DART calls + one small AI call)
  if (r.status === "ok") await refreshUpdates(db, dart, companyId).catch(() => null);
  if (row)
    await db
      .from("collector_runs")
      .update({
        finished_at: new Date().toISOString(),
        ok_count: r.status === "ok" ? 1 : 0,
        fail_count: r.status === "failed" ? 1 : 0,
        calls_used: dart.callsUsed,
        note: `${companyId} · ${r.status}${r.reason ? ` · ${r.reason}` : ""}`.slice(0, 300),
      })
      .eq("id", row.id);
  if (r.status !== "failed") return { ok: true };
  console.error(`[segments-view] ${companyId}: ${r.reason}`);
  if (row) await db.from("collector_failures").insert({ run_id: row.id, target: companyId, reason: (r.reason ?? "failed").slice(0, 300) });
  if (r.reason === "no segments" || r.reason === "no business chapter") return { ok: false, message: "이 기업의 사업보고서에는 사업 부문 정보가 없어요." };
  return { ok: false, message: FAILED };
}
