"use server";
// Server actions for the analysis tab (specs/posting, specs/portfolio, specs/billing BILL-01).
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/data";
import { aiEnabled, AiUnavailable, analyzePosting, extractExperiences } from "@/lib/ai/tasks";
import { canSpend, planFromPasses } from "@/lib/billing/state";
import type { QuotaFeature } from "@/lib/contracts/billing";

export type ActionState = { error?: string; ok?: string } | undefined;

const MAX_BYTES = 10 * 1024 * 1024;

async function readPdf(form: FormData): Promise<Uint8Array | string> {
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return "PDF 파일을 골라 주세요.";
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return "PDF 파일만 올릴 수 있어요.";
  if (f.size > MAX_BYTES) return "10MB 이하 파일만 올릴 수 있어요.";
  return new Uint8Array(await f.arrayBuffer());
}

/** Signed-in Supabase session + quota check. Returns a message when the request cannot start. */
async function gate(feature: QuotaFeature) {
  if (!supabaseEnabled()) return { error: "아직 계정 저장소가 연결되지 않았어요. 지금은 데모 공고로 흐름을 볼 수 있어요." as const };
  if (!aiEnabled()) return { error: "AI 키가 아직 연결되지 않았어요. 지금은 데모 공고로 흐름을 볼 수 있어요." as const };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) redirect(`/auth/login?next=/postings`); // EX-01
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ count }, { data: passes }] = await Promise.all([
    db.from("quota_usage").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    db.from("passes").select("pass_type, expires_at, uses_left"),
  ]);
  const plan = planFromPasses((passes ?? []).map((p) => ({ type: p.pass_type, expiresAt: p.expires_at, usesLeft: p.uses_left })));
  if (!canSpend(plan, count ?? 0)) return { error: "이번 달 쿼터를 다 썼어요. 패스로 쿼터를 늘릴 수 있어요." as const, quota: true }; // EX-04
  return { db, uid, feature };
}

export async function analyzePostingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const pdf = await readPdf(form);
  if (typeof pdf === "string") return { error: pdf };
  const g = await gate("posting_analysis");
  if ("error" in g) return { error: g.error };
  const { db, uid } = g;
  let out;
  try {
    out = await analyzePosting(pdf);
  } catch (e) {
    // EX-03: failure is shown, quota is not charged
    return { error: e instanceof AiUnavailable ? e.message : "공고를 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const { data: posting, error } = await db
    .from("job_postings")
    .insert({ user_id: uid, company_name: out.companyName, title: out.title, deadline: out.deadline, source: "upload" })
    .select("id")
    .single();
  if (error || !posting) return { error: "공고를 저장하지 못했어요." };
  await db.from("quota_usage").insert({ user_id: uid, feature: "posting_analysis" });
  // posting_analyses is written with the server key (users have read-only access to AI results)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("posting_analyses").insert({ posting_id: posting.id, user_id: uid, output: out, model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });
  redirect(`/postings/${posting.id}`);
}

export async function extractExperiencesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const pdf = await readPdf(form);
  if (typeof pdf === "string") return { error: pdf };
  const g = await gate("experience_extraction");
  if ("error" in g) return { error: g.error };
  const { db, uid } = g;
  let out;
  try {
    out = await extractExperiences(pdf);
  } catch (e) {
    return { error: e instanceof AiUnavailable ? e.message : "경험을 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const label = (form.get("file") as File).name;
  const rows = out.experiences.map((x) => ({ ...x, user_id: uid, source_label: label }));
  if (rows.length) await db.from("experiences").insert(rows);
  await db.from("quota_usage").insert({ user_id: uid, feature: "experience_extraction" });
  return { ok: `경험 카드 ${rows.length}장을 만들었어요. 원본 파일은 저장하지 않아요.` };
}
