"use server";
// Server actions for the analysis tab (specs/posting, specs/portfolio, specs/billing BILL-01).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseEnabled } from "@/lib/data";
import { after } from "next/server";
import { gate } from "@/lib/billing/gate";
import { AI_MODEL, AiUnavailable, analyzePosting, PostingNotFound, type PostingSource } from "@/lib/ai/tasks";
import { PostingTextInput, PostingUrlInput } from "@/lib/contracts/activity";
import { checkPostingUrl } from "@/lib/posting/url";
import { linkPosting } from "@/lib/posting/segment";
import { recordJobEvidence } from "@/lib/posting/job-evidence";
import { mayCheckEvidence } from "@/lib/posting/creator";
import { seoulDayStart } from "@/lib/billing/state";
import { JOBS } from "@/lib/reference/jobs";
import { fetchPostingFromUrl, PostingFetchError, type FetchedPosting } from "@/lib/posting/fetch";

export type ActionState = { error?: string; ok?: string } | undefined;

type Db = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

const MAX_BYTES = 10 * 1024 * 1024;

/** Server log line for a failed AI call: error type and message only, no user content or keys. */
function logAiFailure(task: string, e: unknown) {
  const err = e as { name?: string; message?: string; statusCode?: number };
  console.error(`[ai:${task}] ${err?.name ?? "Error"}${err?.statusCode ? ` ${err.statusCode}` : ""}: ${String(err?.message ?? e).slice(0, 300)}`);
}

async function readPdf(form: FormData): Promise<Uint8Array | string> {
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return "PDF 파일을 골라 주세요.";
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return "PDF 파일만 올릴 수 있어요.";
  if (f.size > MAX_BYTES) return "10MB 이하 파일만 올릴 수 있어요.";
  return new Uint8Array(await f.arrayBuffer());
}

/** What to tell the user when the input had no posting body (nothing is stored or charged). */
function notFoundMessage(src: PostingSource, fromUrl: boolean): string {
  if (fromUrl) return "이 페이지에서 공고 본문을 찾지 못했어요. 공고를 자바스크립트로 불러오는 사이트일 수 있어요. 공고 내용을 복사해 붙여넣거나 PDF로 올려 주세요.";
  if (src.kind === "text") return "붙여넣은 내용에서 공고 본문을 찾지 못했어요. 맡을 업무와 자격 요건이 들어간 부분까지 붙여넣어 주세요.";
  return "올린 파일에서 공고 본문을 찾지 못했어요. 채용공고 내용이 담긴 파일인지 확인해 주세요.";
}

/** Runs the AI on one posting, stores posting + analysis, charges quota only on success (EX-03), then opens the result. */
async function analyzeAndSave(db: Db, uid: string, src: PostingSource, sourceUrl?: string): Promise<ActionState> {
  let out;
  try {
    out = await analyzePosting(src);
  } catch (e) {
    if (e instanceof PostingNotFound) return { error: notFoundMessage(src, !!sourceUrl) };
    logAiFailure("posting_analysis", e);
    return { error: e instanceof AiUnavailable ? e.message : "공고를 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const link = await linkPosting(out); // POST-05: catalogue company and division, when clear
  const jobRoleId = out.jobRoleId && JOBS.some((j) => j.id === out.jobRoleId) ? out.jobRoleId : null; // POST-07
  const { data: posting, error } = await db
    .from("job_postings")
    .insert({
      user_id: uid,
      company_id: link.companyId,
      segment_id: link.segmentId,
      job_role_id: jobRoleId,
      company_name: out.companyName,
      title: out.title,
      deadline: out.deadline,
      source: sourceUrl ? "url" : "upload",
      ...(sourceUrl ? { source_url: sourceUrl } : {}),
    })
    .select("id")
    .single();
  if (error || !posting) return { error: "공고를 저장하지 못했어요." };
  await db.from("quota_usage").insert({ user_id: uid, feature: "posting_analysis" });
  // posting_analyses is written with the server key (users have read-only access to AI results)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("posting_analyses").insert({ posting_id: posting.id, user_id: uid, output: out, model: AI_MODEL });
  // POST-07: confirm on the web that the company posts this job, after the response (the user does not wait)
  // SAFE-03: a person's postings feed shared data at most EVIDENCE_DAILY_LIMIT times a day (the posting itself is always saved)
  const { count: today } = await db.from("job_postings").select("id", { count: "exact", head: true }).gte("created_at", seoulDayStart());
  if (jobRoleId && link.companyId && mayCheckEvidence(today ?? 0)) {
    const companyId = link.companyId;
    after(() => recordJobEvidence({ jobRoleId, companyId, segmentId: link.segmentId, companyName: out.companyName, title: out.title, submittedUrl: sourceUrl ?? null, creatorUid: uid }));
  }
  redirect(`/postings/${posting.id}`);
}

/** FR-POST-01: 공고 PDF 올리기 */
export async function analyzePostingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const pdf = await readPdf(form);
  if (typeof pdf === "string") return { error: pdf };
  const g = await gate("posting_analysis");
  if ("error" in g) return { error: g.error };
  return analyzeAndSave(g.db, g.uid, { kind: "pdf", data: pdf });
}

/** POST-03: 공고 주소로 정리하기. Fetches only the submitted page; a failed fetch is not charged. */
export async function analyzePostingUrlAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = PostingUrlInput.safeParse(form.get("url"));
  if (!input.success) return { error: input.error.issues[0]?.message ?? "공고 주소를 넣어 주세요." };
  const checked = checkPostingUrl(input.data);
  if (!checked.ok) return { error: checked.error };
  const g = await gate("posting_analysis");
  if ("error" in g) return { error: g.error };
  let src: FetchedPosting;
  try {
    src = await fetchPostingFromUrl(checked.url.toString());
  } catch (e) {
    return { error: e instanceof PostingFetchError ? e.message : "페이지를 가져오지 못했어요. PDF로 올려 주세요." };
  }
  return analyzeAndSave(g.db, g.uid, src, src.url);
}

/** POST-04: 공고 내용 붙여넣기, for pages that load the posting with JavaScript or need a login. Stored as source "upload". */
export async function analyzePostingTextAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = PostingTextInput.safeParse(form.get("text"));
  if (!input.success) return { error: input.error.issues[0]?.message ?? "공고 내용을 붙여넣어 주세요." };
  const g = await gate("posting_analysis");
  if ("error" in g) return { error: g.error };
  return analyzeAndSave(g.db, g.uid, { kind: "text", text: input.data });
}

/**
 * 공고 삭제 (specs/posting POST-08): the signed-in user's own posting (RLS "own rows"). Its AI summary and its
 * connection go with it (on delete cascade); the user's activity and episode cards stay. Shared job evidence made from
 * it stays too: it no longer points to the user. Today's posting count is not given back.
 */
export async function deletePostingAction(id: string): Promise<{ ok?: string; error?: string }> {
  const pid = String(id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(pid)) return { error: "지울 공고를 찾지 못했어요." };
  if (!supabaseEnabled()) return { error: "데모 공고는 지울 수 없어요." };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "로그인하면 공고를 지울 수 있어요." };
  const { data, error } = await db.from("job_postings").delete().eq("id", pid).select("id");
  if (error) return { error: "공고를 지우지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  if (!data?.length) return { error: "지울 공고를 찾지 못했어요." };
  revalidatePath("/postings");
  revalidatePath("/connect");
  return { ok: "공고를 지웠어요." };
}
