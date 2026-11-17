"use server";
// 연결 결과 만들기 (specs/connection FR-PREM-02). Premium feature, quota-charged, AI output validated before storing.
import { revalidatePath } from "next/cache";
import { supabaseEnabled, userData } from "@/lib/data";
import { AI_MODEL, aiEnabled, AiUnavailable, connect, extractQuestions, matchQuestions } from "@/lib/ai/tasks";
import { EssayQuestion, PostingAnalysisOutput } from "@/lib/contracts/activity";
import { z } from "zod";
import { currentPlan } from "@/lib/billing/server";
import type { ActionState } from "@/app/(main)/postings/actions";
import { logAiFailure } from "@/lib/ai/clamp";
import { cardsKey } from "@/lib/connect/freshness";
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
    await createAdminClient().from("connections").upsert({ posting_id: postingId, user_id: uid, output: { ...out, basis: cardsKey(episodes, activities) }, model: AI_MODEL });
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

/** Signed-in Supabase client, or the message to show. */
async function signedInDb() {
  if (!supabaseEnabled()) return { error: "데모 모드에서는 저장하지 않아요. 로그인이 연결되면 공고에 저장돼요." } as const;
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "로그인하면 문항을 저장할 수 있어요." } as const;
  return { db } as const;
}

/** FR-PREM-05: the AI reads all questions and episodes, then matches by content. On failure the questions stay as they are. */
async function withMatches(postingId: string, questions: EssayQuestion[]): Promise<{ questions: EssayQuestion[]; matched: boolean }> {
  if (!aiEnabled()) return { questions, matched: false };
  try {
    const { repo } = await userData();
    const [episodes, activities, analysis, connection] = await Promise.all([repo.experiences(), repo.activities(), repo.postingAnalysis(postingId), repo.connection(postingId)]);
    const basis = cardsKey(episodes);
    const matched = await matchQuestions(questions, episodes, activities, analysis, connection);
    return { questions: matched.map((q) => ({ ...q, basis })), matched: true };
  } catch (e) {
    logAiFailure("match_questions", e);
    return { questions, matched: false };
  }
}

type Db = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

async function storeQuestions(db: Db, postingId: string, questions: EssayQuestion[]) {
  const { data, error } = await db.from("job_postings").update({ questions }).eq("id", postingId).select("id");
  if (error) logAiFailure("save_questions", error);
  return !error && !!data?.length;
}

async function savedQuestions(postingId: string): Promise<EssayQuestion[]> {
  const { repo } = await userData();
  return (await repo.posting(postingId))?.questions ?? [];
}

/** FR-PREM-04/05: saves the confirmed questions on the posting and matches them with the episodes. */
export async function saveQuestionsAction(postingId: string, questions: unknown): Promise<{ ok?: string; error?: string }> {
  const q = Questions.safeParse(questions);
  if (!q.success) return { error: q.error.issues[0]?.message ?? "문항 형식이 올바르지 않아요." };
  const g = await signedInDb();
  if ("error" in g) return { error: g.error };
  const { questions: out, matched } = await withMatches(postingId, q.data);
  if (!(await storeQuestions(g.db, postingId, out))) return { error: "문항을 저장하지 못했어요." };
  revalidatePath(`/connect/${postingId}/kit`);
  return { ok: matched ? "문항을 저장하고 에피소드를 이었어요." : "문항을 저장했어요. 에피소드는 테마로 배정했어요." };
}

/** FR-PREM-05 다시 연결하기: after new episodes, match again (the user's own choices stay). */
export async function rematchQuestionsAction(postingId: string): Promise<{ ok?: string; error?: string }> {
  const g = await signedInDb();
  if ("error" in g) return { error: g.error };
  const saved = await savedQuestions(postingId);
  if (!saved.length) return { error: "저장된 문항이 없어요." };
  if (!aiEnabled()) return { error: "AI 키가 연결되면 다시 이어요." };
  const { questions: out, matched } = await withMatches(postingId, saved);
  if (!matched) return { error: "에피소드를 잇지 못했어요. 잠시 뒤 다시 눌러 주세요." };
  if (!(await storeQuestions(g.db, postingId, out))) return { error: "저장하지 못했어요." };
  revalidatePath(`/connect/${postingId}/kit`);
  return { ok: "에피소드를 다시 이었어요." };
}

/**
 * FR-PREM-05 직접 바꾸기: the user picks the episode for a question ("" = none). "auto" hands the question back to the AI.
 * The chosen episode is taken away from other questions that the AI had given it to.
 */
export async function setQuestionEpisodeAction(postingId: string, questionId: string, choice: string): Promise<{ ok?: string; error?: string }> {
  const g = await signedInDb();
  if ("error" in g) return { error: g.error };
  const saved = await savedQuestions(postingId);
  if (!saved.some((x) => x.id === questionId)) return { error: "문항을 찾지 못했어요." };
  let next: EssayQuestion[];
  if (choice === "auto") {
    next = saved.map((x) => (x.id === questionId ? { ...x, manual: false, episodeIds: undefined, fit: undefined, need: undefined } : x));
    next = (await withMatches(postingId, next)).questions;
  } else {
    const ids = choice ? [choice] : [];
    next = saved.map((x) =>
      x.id === questionId
        ? { ...x, manual: true, episodeIds: ids, fit: choice ? "직접 고른 에피소드예요." : undefined, need: undefined }
        : !x.manual && choice && x.episodeIds?.includes(choice)
          ? { ...x, episodeIds: x.episodeIds.filter((id) => id !== choice) }
          : x,
    );
  }
  const parsed = Questions.safeParse(next);
  if (!parsed.success || !(await storeQuestions(g.db, postingId, parsed.data))) return { error: "저장하지 못했어요." };
  revalidatePath(`/connect/${postingId}/kit`);
  return { ok: choice === "auto" ? "AI 추천으로 되돌렸어요." : "에피소드를 바꿨어요." };
}
