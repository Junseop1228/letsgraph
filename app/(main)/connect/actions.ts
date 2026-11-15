"use server";
// 연결 결과 만들기 (specs/connection FR-PREM-02). Premium feature, quota-charged, AI output validated before storing.
import { revalidatePath } from "next/cache";
import { supabaseEnabled } from "@/lib/data";
import { AI_MODEL, aiEnabled, AiUnavailable, connect } from "@/lib/ai/tasks";
import { PostingAnalysisOutput, Experience } from "@/lib/contracts/activity";
import { currentPlan } from "@/lib/billing/server";
import type { ActionState } from "@/app/(main)/postings/actions";

export async function connectAction(postingId: string, _prev: ActionState): Promise<ActionState> {
  if (!supabaseEnabled() || !aiEnabled()) return { error: "아직 AI와 계정 저장소가 연결되지 않았어요. 데모 공고에서 결과를 볼 수 있어요." };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { error: "로그인이 필요해요." };
  const plan = await currentPlan(db);
  if (plan.plan !== "premium") return { error: "연결 결과는 패스가 있으면 볼 수 있어요." }; // EX-05
  if (plan.remaining <= 0) return { error: "이번 달 쿼터를 다 썼어요." }; // EX-04

  const [{ data: a }, { data: exps }, { data: posting }] = await Promise.all([
    db.from("posting_analyses").select("output").eq("posting_id", postingId).maybeSingle(),
    db.from("experiences").select("*"),
    db.from("job_postings").select("segment_id").eq("id", postingId).maybeSingle(),
  ]);
  if (!a) return { error: "먼저 공고를 정리해 주세요." };
  if (!exps?.length) return { error: "등록된 경험이 없어요. 경험 카드를 먼저 만들어 주세요." }; // FR-PREM-02 E1
  let context: string[] = [];
  if (posting?.segment_id) {
    const { data: seg } = await db.from("business_segments").select("name, summary, revenue, operating_income").eq("id", posting.segment_id).maybeSingle();
    if (seg) context = [`${seg.name}: ${seg.summary}`, `매출 ${seg.revenue ?? "?"}억, 영업이익 ${seg.operating_income ?? "?"}억`];
  }
  try {
    const out = await connect(
      PostingAnalysisOutput.parse(a.output),
      exps.map((e) => Experience.parse({ ...e, sourceLabel: e.source_label ?? undefined, period: e.period ?? undefined })),
      context,
    );
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().from("connections").upsert({ posting_id: postingId, user_id: uid, output: out, model: AI_MODEL });
    await db.from("quota_usage").insert({ user_id: uid, feature: "connection" });
  } catch (e) {
    return { error: e instanceof AiUnavailable ? e.message : "연결 결과를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." }; // EX-03
  }
  revalidatePath(`/connect/${postingId}`);
  return { ok: "연결 결과를 만들었어요." };
}
