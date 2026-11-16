"use server";
// 연결 결과 만들기 (specs/connection FR-PREM-02). Premium feature, quota-charged, AI output validated before storing.
import { revalidatePath } from "next/cache";
import { supabaseEnabled, userData } from "@/lib/data";
import { AI_MODEL, aiEnabled, AiUnavailable, connect, extractQuestions } from "@/lib/ai/tasks";
import { EssayQuestion, PostingAnalysisOutput } from "@/lib/contracts/activity";
import { z } from "zod";
import { currentPlan } from "@/lib/billing/server";
import type { ActionState } from "@/app/(main)/postings/actions";
import { logAiFailure } from "@/lib/ai/clamp";
import { linkPosting } from "@/lib/posting/segment";

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

  const { repo } = await userData();
  const [{ data: a }, episodes, activities, { data: posting }] = await Promise.all([
    db.from("posting_analyses").select("output").eq("posting_id", postingId).maybeSingle(),
    repo.experiences(),
    repo.activities(),
    db.from("job_postings").select("segment_id, company_id").eq("id", postingId).maybeSingle(),
  ]);
  if (!a) return { error: "먼저 공고를 정리해 주세요." };
  if (!episodes.length) return { error: "아직 에피소드가 없어요. 관리 > 만들기에서 에피소드를 먼저 꺼내 주세요." }; // FR-PREM-02 E1
  const analysis = PostingAnalysisOutput.parse(a.output);
  // POST-05: postings saved before divisions were linked get their company and division now
  let segmentId: string | null = posting?.segment_id ?? null;
  if (posting && !segmentId) {
    const link = await linkPosting(analysis);
    if (link.companyId || link.segmentId) {
      await db.from("job_postings").update({ company_id: link.companyId ?? posting.company_id, segment_id: link.segmentId }).eq("id", postingId);
    }
    segmentId = link.segmentId;
  }
  let context: string[] = [];
  if (segmentId) {
    const { data: seg } = await db.from("business_segments").select("name, summary, revenue, operating_income").eq("id", segmentId).maybeSingle();
    if (seg) context = [`${seg.name}: ${seg.summary}`, `매출 ${seg.revenue ?? "?"}억, 영업이익 ${seg.operating_income ?? "?"}억`];
  }
  try {
    const out = await connect(analysis, episodes, activities, context);
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().from("connections").upsert({ posting_id: postingId, user_id: uid, output: out, model: AI_MODEL });
    await db.from("quota_usage").insert({ user_id: uid, feature: "connection" });
  } catch (e) {
    logAiFailure("connect", e);
    return { error: e instanceof AiUnavailable ? e.message : "연결 결과를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." }; // EX-03
  }
  revalidatePath(`/connect/${postingId}`);
  return { ok: "연결 결과를 만들었어요." };
}

const Pasted = z.string().trim().min(10, "문항이 들어간 부분까지 붙여넣어 주세요.").max(20000, "2만 자까지 붙여넣을 수 있어요.");
const Questions = z.array(EssayQuestion).min(1, "문항이 하나도 없어요.").max(10, "문항은 10개까지 저장해요.");

/** FR-PREM-04: reads the questions from a pasted application form. Nothing is saved until the user confirms. */
export async function parseQuestionsAction(pasted: unknown): Promise<{ questions?: EssayQuestion[]; error?: string }> {
  const p = Pasted.safeParse(pasted);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "붙여넣은 내용을 읽지 못했어요." };
  if (!aiEnabled()) return { error: "AI 키가 연결되면 지원서에서 문항을 뽑아요." };
  try {
    const questions = await extractQuestions(p.data);
    return questions.length ? { questions } : { error: "문항을 찾지 못했어요. 문항과 글자 수가 보이는 부분까지 붙여넣어 주세요." };
  } catch (e) {
    logAiFailure("extract_questions", e);
    return { error: "문항을 뽑지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
}

/** FR-PREM-04: saves the confirmed questions on the posting (own rows only). */
export async function saveQuestionsAction(postingId: string, questions: unknown): Promise<{ ok?: string; error?: string }> {
  const q = Questions.safeParse(questions);
  if (!q.success) return { error: q.error.issues[0]?.message ?? "문항 형식이 올바르지 않아요." };
  if (!supabaseEnabled()) return { error: "데모 모드에서는 저장하지 않아요. 로그인이 연결되면 공고에 저장돼요." };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "로그인하면 문항을 저장할 수 있어요." };
  const { data, error } = await db.from("job_postings").update({ questions: q.data }).eq("id", postingId).select("id");
  if (error || !data?.length) {
    if (error) logAiFailure("save_questions", error);
    return { error: "문항을 저장하지 못했어요." };
  }
  revalidatePath(`/connect/${postingId}/kit`);
  return { ok: "문항을 저장했어요. 키트가 문항에 맞춰 바뀌었어요." };
}
