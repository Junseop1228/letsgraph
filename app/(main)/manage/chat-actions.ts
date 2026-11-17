"use server";
// 경험 대화 서버 액션 (specs/portfolio PORT-02, PORT-03, PORT-04). Without an AI key a demo script answers instead,
// and without the account store nothing is saved (the flow still continues so it can be shown).
// Failed AI calls are logged on the server (error type and message only).
import { revalidatePath } from "next/cache";
import { supabaseEnabled } from "@/lib/data";
import { aiEnabled, AiUnavailable, extractActivities } from "@/lib/ai/tasks";
import { activityFromPdf, activityFromRepo, chatReply, draftActivity, draftEpisode, suggestEpisodes, type ChatTurn } from "@/lib/ai/chat";
import { parseActivityLink } from "@/lib/activity/link";
import { readRepo, RepoReadError } from "@/lib/github/repo";
import { logAiFailure } from "@/lib/ai/clamp";
import { gate, recordUse } from "@/lib/billing/gate";
import { Activity, ActivityOutput, ChatLog, EpisodeTheme, ExperienceOutput, type EpisodeSuggestion } from "@/lib/contracts/activity";

const History = ChatLog;
const Theme = EpisodeTheme.nullable().optional();
const MAX_PDF = 10 * 1024 * 1024;

const DEMO = {
  activity: [
    "좋아요. 그 활동은 언제부터 언제까지 했어요?",
    "몇 명이 함께했고, 본인은 어떤 역할을 맡았어요?",
    "정리할 준비가 됐어요. 오른쪽의 '활동 카드 만들기'를 눌러 주세요.",
  ],
  episode: [
    "그 장면에서 처음에 어떤 문제가 있었나요?",
    "그때 본인이 맡은 일은 무엇이었어요?",
    "문제를 풀려고 직접 한 행동을 순서대로 말해 줄래요?",
    "그래서 무엇이 달라졌나요? 숫자로 말할 수 있으면 더 좋아요.",
    "그 일로 배운 점이 있다면 한 문장으로 말해 줄래요?",
    "정리할 준비가 됐어요. 오른쪽의 '에피소드 초안 만들기'를 눌러 주세요.",
  ],
};


function readPdf(form: FormData): File | string {
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return "PDF 파일을 골라 주세요.";
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return "PDF 파일만 올릴 수 있어요.";
  if (f.size > MAX_PDF) return "10MB 이하 파일만 올릴 수 있어요.";
  return f;
}

/** Next coach message. `activity` = the activity being worked on (stage 2), or null while settling one (stage 1). */
export async function sendChatAction(
  history: ChatTurn[],
  activity: unknown = null,
  theme: unknown = null,
): Promise<{ reply?: string; betterTheme?: EpisodeTheme; error?: string; pay?: boolean; demo?: boolean }> {
  const h = History.safeParse(history);
  if (!h.success) return { error: "대화가 너무 길어요. 지금까지를 카드로 정리한 뒤 이어 주세요." };
  const a = ActivityOutput.nullable().safeParse(activity);
  const t = Theme.safeParse(theme);
  if (!a.success || !t.success) return { error: "활동 정보를 읽지 못했어요. 활동을 다시 골라 주세요." };
  if (!aiEnabled()) {
    const script = a.data ? DEMO.episode : DEMO.activity;
    const asked = h.data.filter((x) => x.role === "assistant").length - 1; // the opening message is not scripted
    return { reply: script[Math.min(Math.max(0, asked), script.length - 1)], demo: true };
  }
  if (supabaseEnabled()) {
    const g = await gate(a.data ? "episode_save" : "activity_save", "/manage?tab=chat");
    if ("error" in g) return { error: g.error, pay: g.pay };
  }
  try {
    const out = await chatReply(h.data, a.data, t.data);
    return { reply: out.reply, betterTheme: out.betterTheme ?? undefined };
  } catch (e) {
    logAiFailure("chat_reply", e);
    return { error: "답을 만들지 못했어요. 잠시 뒤 다시 보내 주세요." };
  }
}

/** 추천 에피소드 (PORT-04). Without an AI key there are no suggestions; the theme buttons still work. */
export async function suggestEpisodesAction(activity: unknown): Promise<{ suggestions: EpisodeSuggestion[]; demo?: boolean }> {
  const a = ActivityOutput.safeParse(activity);
  if (!a.success) return { suggestions: [] };
  if (!aiEnabled()) return { suggestions: [], demo: true };
  if (supabaseEnabled() && "error" in (await gate("episode_save", "/manage?tab=chat"))) return { suggestions: [] };
  try {
    return { suggestions: await suggestEpisodes(a.data) };
  } catch (e) {
    logAiFailure("suggest_episodes", e);
    return { suggestions: [] };
  }
}

/** 활동 카드 초안 from the stage-1 conversation. */
export async function draftActivityAction(history: ChatTurn[]): Promise<{ draft?: ActivityOutput; error?: string; pay?: boolean; demo?: boolean }> {
  const h = History.safeParse(history);
  if (!h.success) return { error: "대화를 읽지 못했어요." };
  const said = h.data.filter((t) => t.role === "user").map((t) => t.text.trim());
  if (!aiEnabled()) {
    // demo: arrange the user's own words without adding facts
    return {
      demo: true,
      draft: { title: (said[0] ?? "새 활동").slice(0, 40), kind: "other", period: said[1]?.slice(0, 40), role: said[2]?.slice(0, 200), summary: said.join(" ").slice(0, 800) },
    };
  }
  if (supabaseEnabled()) {
    const g = await gate("activity_save", "/manage?tab=chat");
    if ("error" in g) return { error: g.error, pay: g.pay };
  }
  try {
    return { draft: await draftActivity(h.data) };
  } catch (e) {
    logAiFailure("draft_activity", e);
    return { error: "활동 카드 초안을 만들지 못했어요. 잠시 뒤 다시 눌러 주세요." };
  }
}

/** 활동 카드 초안 from a PDF. Spends one experience_extraction quota on success; the file is not stored. */
export async function activityFromPdfAction(form: FormData): Promise<{ draft?: ActivityOutput; error?: string; pay?: boolean }> {
  const f = readPdf(form);
  if (typeof f === "string") return { error: f };
  if (!aiEnabled()) return { error: "AI 키가 연결되면 PDF에서 활동을 정리해요. 지금은 활동을 글로 소개해 주세요." };
  if (!supabaseEnabled()) return { error: "로그인이 연결되면 PDF로 활동을 정리할 수 있어요. 지금은 글로 소개해 주세요." };
  const g = await gate("activity_save", "/manage?tab=chat");
  if ("error" in g) return { error: g.error, pay: g.pay };
  try {
    const draft = await activityFromPdf(new Uint8Array(await f.arrayBuffer()));
    return { draft };
  } catch (e) {
    logAiFailure("activity_pdf", e);
    return { error: e instanceof AiUnavailable ? e.message : "PDF에서 활동을 정리하지 못했어요. 글로 소개해 주세요." };
  }
}

/**
 * 카드 탭 "PDF로 활동 카드 만들기" (FR-PREM-01): one activity card per activity in the PDF, with scene candidates.
 * No episodes are made here; they are taken out in the chat. One experience_extraction quota; the file is not stored.
 */
export async function importActivitiesAction(_prev: { error?: string; pay?: boolean; ok?: string } | undefined, form: FormData): Promise<{ error?: string; pay?: boolean; ok?: string }> {
  const f = readPdf(form);
  if (typeof f === "string") return { error: f };
  const g = await gate("activity_save", "/manage?tab=cards");
  if ("error" in g) return { error: g.error, pay: g.pay };
  let out;
  try {
    out = await extractActivities(new Uint8Array(await f.arrayBuffer()));
  } catch (e) {
    logAiFailure("import_activities", e);
    return { error: e instanceof AiUnavailable ? e.message : "PDF에서 활동을 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  if (!out.activities.length) return { error: "PDF에서 활동을 찾지 못했어요. 프로젝트나 활동이 적힌 파일인지 확인해 주세요." };
  const all = out.activities.map((a) => ({
    user_id: g.uid, title: a.title, kind: a.kind, period: a.period ?? null, role: a.role ?? null, dataset: a.dataset ?? null, summary: a.summary,
    scenes: a.scenes ?? [], source_label: f.name.slice(0, 80),
  }));
  const rows = g.remaining === null ? all : all.slice(0, g.remaining); // free: only what is left of the limit
  const { error } = await g.db.from("activities").insert(rows);
  if (error) {
    logAiFailure("import_activities_save", error);
    return { error: "활동 카드를 저장하지 못했어요." };
  }
  await recordUse(g.db, g.uid, "activity_save", rows.length);
  revalidatePath("/manage");
  if (rows.length < all.length) {
    return { ok: `PDF에서 활동 ${all.length}개를 찾았는데, 무료로는 ${rows.length}개까지만 저장했어요. 시즌 패스가 있으면 모두 저장할 수 있어요.`, pay: true };
  }
  return { ok: `활동 카드 ${rows.length}개를 만들었어요. 활동 줄 끝에서 에피소드를 꺼내 보세요. 원본 파일은 저장하지 않아요.` };
}

/** Saves the activity. In demo mode it is not saved, but a temporary activity is returned so the flow continues. */
export async function saveActivityAction(draft: unknown): Promise<{ activity?: Activity; ok?: string; error?: string; pay?: boolean }> {
  const d = ActivityOutput.safeParse(draft);
  if (!d.success) return { error: "활동 카드 내용이 올바르지 않아요." };
  if (!supabaseEnabled()) return { activity: { ...d.data, id: `demo-${Date.now()}`, sourceLabel: "경험 대화" }, ok: "데모 모드라 저장하지 않고 이어서 진행해요." };
  const g = await gate("activity_save", "/manage?tab=chat", false);
  if ("error" in g) return { error: g.error, pay: g.pay };
  const { db, uid } = g;
  const parsedLink = d.data.link ? parseActivityLink(d.data.link) : null;
  const link = parsedLink && "link" in parsedLink ? parsedLink.link.url : null; // PORT-06: allowed sites only
  const label = parsedLink && "link" in parsedLink ? `GitHub ${parsedLink.link.owner}/${parsedLink.link.repo}` : "경험 대화";
  const { data, error } = await db
    .from("activities")
    .insert({ user_id: uid, title: d.data.title, kind: d.data.kind, period: d.data.period ?? null, role: d.data.role ?? null, dataset: d.data.dataset ?? null, summary: d.data.summary, scenes: d.data.scenes ?? [], link_url: link, source_label: label })
    .select("id")
    .single();
  if (error || !data) {
    logAiFailure("save_activity", error);
    return { error: "활동을 저장하지 못했어요." };
  }
  await recordUse(db, uid, "activity_save");
  return { activity: { ...d.data, link: link ?? undefined, id: data.id, sourceLabel: label }, ok: "활동을 저장했어요. 이제 에피소드를 꺼내 볼게요." };
}

/** 에피소드 초안 from the stage-2 conversation. */
export async function draftEpisodeAction(history: ChatTurn[], activity: unknown, theme: unknown = null): Promise<{ draft?: ExperienceOutput; error?: string; pay?: boolean; demo?: boolean }> {
  const h = History.safeParse(history);
  const a = ActivityOutput.safeParse(activity);
  const t = Theme.safeParse(theme);
  if (!h.success || !a.success || !t.success) return { error: "대화를 읽지 못했어요." };
  const said = h.data.filter((x) => x.role === "user").map((x) => x.text.trim());
  if (!aiEnabled()) {
    // demo: the scripted questions ask scene, situation, role, action, result, learning in that order
    return {
      demo: true,
      draft: {
        title: (said[0] ?? "새 에피소드").slice(0, 40),
        kind: a.data.kind,
        theme: t.data ?? undefined,
        period: a.data.period,
        situation: (said[1] ?? "").slice(0, 300),
        role: said[2]?.slice(0, 200),
        action: (said[3] ?? "").slice(0, 400),
        result: (said[4] ?? "수치는 직접 확인해서 넣어요").slice(0, 300),
        learning: said[5]?.slice(0, 300),
        competencies: [],
      },
    };
  }
  if (supabaseEnabled()) {
    const g = await gate("episode_save", "/manage?tab=chat");
    if ("error" in g) return { error: g.error, pay: g.pay };
  }
  try {
    return { draft: await draftEpisode(h.data, a.data, t.data) };
  } catch (e) {
    logAiFailure("draft_episode", e);
    return { error: "에피소드 초안을 만들지 못했어요. 잠시 뒤 다시 눌러 주세요." };
  }
}

/** Saves an episode under its activity (the activity must be the user's own), with the conversation that made it. */
export async function saveEpisodeAction(draft: unknown, activityId: string, log: unknown = []): Promise<{ ok?: string; error?: string; pay?: boolean; id?: string }> {
  const d = ExperienceOutput.safeParse(draft);
  if (!d.success) return { error: "에피소드 내용이 올바르지 않아요." };
  const chatLog = ChatLog.safeParse(log);
  if (!supabaseEnabled()) return { ok: "데모 모드라 저장하지 않아요. 로그인이 연결되면 카드에 쌓여요." };
  const g = await gate("episode_save", "/manage?tab=chat", false);
  if ("error" in g) return { error: g.error, pay: g.pay };
  const { db, uid } = g;
  const { data: owner } = await db.from("activities").select("id, title").eq("id", activityId).maybeSingle(); // RLS: own rows only
  if (!owner) return { error: "활동을 찾지 못했어요. 활동을 다시 골라 주세요." };
  const e = d.data;
  const { data: row, error } = await db.from("experiences").insert({
    user_id: uid,
    activity_id: owner.id,
    source_label: owner.title,
    title: e.title,
    kind: e.kind,
    theme: e.theme ?? null,
    period: e.period ?? null,
    situation: e.situation,
    role: e.role ?? "",
    action: e.action,
    result: e.result,
    learning: e.learning ?? "",
    competencies: e.competencies,
    chat_log: chatLog.success ? chatLog.data : [],
  }).select("id").single();
  if (error) {
    logAiFailure("save_episode", error);
    return { error: "에피소드를 저장하지 못했어요." };
  }
  return { ok: "에피소드를 저장했어요.", id: row?.id };
}

/**
 * 활동 카드 초안 from a GitHub repository (PORT-06), for the chat's stage 1. Only GitHub repository addresses are
 * accepted for now. Spends one experience_extraction quota on success; nothing from the repository is stored but the link.
 */
export async function activityFromRepoAction(url: string): Promise<{ draft?: ActivityOutput; error?: string; pay?: boolean }> {
  const p = parseActivityLink(String(url ?? ""));
  if ("error" in p) return { error: p.error };
  if (!aiEnabled()) return { error: "AI 키가 연결되면 저장소에서 활동을 정리해요. 지금은 활동을 글로 소개해 주세요." };
  if (!supabaseEnabled()) return { error: "로그인이 연결되면 저장소로 활동을 정리할 수 있어요. 지금은 글로 소개해 주세요." };
  const g = await gate("activity_save", "/manage?tab=chat");
  if ("error" in g) return { error: g.error, pay: g.pay };
  try {
    const draft = await activityFromRepo(await readRepo(p.link));
    return { draft };
  } catch (e) {
    if (e instanceof RepoReadError) return { error: e.message };
    logAiFailure("activity_repo", e);
    return { error: e instanceof AiUnavailable ? e.message : "저장소에서 활동을 정리하지 못했어요. 글로 소개해 주세요." };
  }
}

/** 카드 탭 "GitHub 주소로 만들기" (PORT-06): one activity card from a repository, saved right away with its link. */
export async function importActivityFromRepoAction(_prev: { error?: string; pay?: boolean; ok?: string } | undefined, form: FormData): Promise<{ error?: string; pay?: boolean; ok?: string }> {
  const p = parseActivityLink(String(form.get("url") ?? ""));
  if ("error" in p) return { error: p.error };
  if (!aiEnabled()) return { error: "AI 키가 연결되면 저장소에서 활동을 정리해요." };
  const g = await gate("activity_save", "/manage?tab=cards");
  if ("error" in g) return { error: g.error, pay: g.pay };
  let a: ActivityOutput;
  try {
    a = await activityFromRepo(await readRepo(p.link));
  } catch (e) {
    if (e instanceof RepoReadError) return { error: e.message };
    logAiFailure("import_activity_repo", e);
    return { error: e instanceof AiUnavailable ? e.message : "저장소에서 활동을 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const { error } = await g.db.from("activities").insert({
    user_id: g.uid, title: a.title, kind: a.kind, period: a.period ?? null, role: a.role ?? null, dataset: a.dataset ?? null, summary: a.summary,
    scenes: a.scenes ?? [], link_url: p.link.url, source_label: `GitHub ${p.link.owner}/${p.link.repo}`,
  });
  if (error) {
    logAiFailure("import_activity_repo_save", error);
    return { error: "활동 카드를 저장하지 못했어요." };
  }
  await recordUse(g.db, g.uid, "activity_save");
  revalidatePath("/manage");
  return { ok: `"${a.title}" 활동 카드를 만들었어요. 맡은 역할은 저장소만으로 알 수 없어서 비워 뒀어요. 대화에서 에피소드를 꺼내며 채워 보세요.` };
}
