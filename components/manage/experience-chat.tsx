"use client";
// 경험 대화 화면 (specs/portfolio PORT-02, PORT-03, PORT-04).
// 1) 활동 정하기: pick a saved activity, or introduce one in the chat (text) or attach a PDF -> 활동 카드 초안 -> 저장.
// 2) 에피소드 꺼내기: suggested episodes by theme appear by themselves; picking one (or a theme) is sent as the answer,
//    then the coach asks in that theme's order -> 에피소드 초안 -> 저장 -> suggestions again for the next one.
//    AI-made drafts and suggestions carry an AI label. The window has a fixed height: the conversation scrolls inside
//    it (newest at the bottom), and the right panel keeps the 대화 기록 of the activity's episodes.
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, FolderGit2, Paperclip, Send } from "lucide-react";
import { findLink, parseActivityLink } from "@/lib/activity/link";
import {
  activityFromPdfAction,
  activityFromRepoAction,
  draftActivityAction,
  draftEpisodeAction,
  saveActivityAction,
  saveEpisodeAction,
  sendChatAction,
  suggestEpisodesAction,
} from "@/app/(main)/manage/chat-actions";
import type { ChatTurn } from "@/lib/ai/chat";
import {
  EPISODE_THEME_LABEL,
  EXPERIENCE_KIND_LABEL,
  type Activity,
  type ActivityOutput,
  type EpisodeSuggestion,
  type EpisodeTheme,
  type Experience,
} from "@/lib/contracts/activity";
import { ActivityTile } from "@/components/manage/activity-tile";
import { ConfirmDelete } from "@/components/manage/confirm-delete";
import { clearChatLogAction } from "@/app/(main)/manage/card-actions";
import { btn, Kicker, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";
import { withRo } from "@/lib/manage/josa";
import { SpeakerDot } from "@/components/manage/speaker-dot";

type EpisodeDraft = NonNullable<Awaited<ReturnType<typeof draftEpisodeAction>>["draft"]>;
type Props = { activities: Activity[]; episodes: Experience[]; initialActivityId?: string; initialLogId?: string };
/** key = the episode id once saved (so its log can be deleted), or a temporary key */
type Log = { key: string; activityId: string; title: string; theme?: EpisodeTheme; turns: ChatTurn[] };
const isSavedId = (key: string) => /^[0-9a-f-]{36}$/i.test(key);

const THEMES = Object.keys(EPISODE_THEME_LABEL) as EpisodeTheme[];
const OPEN_ACTIVITY: ChatTurn = {
  role: "assistant",
  text: "어떤 활동에서 에피소드를 꺼내 볼까요? 오른쪽에서 저장한 활동을 고르거나, 활동을 글로 소개하거나, PDF를 올리거나 GitHub 저장소 주소를 붙여넣어 주세요.",
};
const openEpisode = (a: Activity, again = false): ChatTurn => ({
  role: "assistant",
  text: again
    ? `'${a.title}'에서 다른 에피소드도 꺼내 볼까요? 아래 추천에서 고르거나 테마를 골라 주세요.`
    : `'${a.title}'에서 에피소드를 꺼내 볼게요. 아래 추천 에피소드에서 고르거나, 테마를 고르거나, 떠오르는 장면을 바로 말해 주세요.`,
});
const toCtx = (a: Activity): ActivityOutput => ({ title: a.title, kind: a.kind, period: a.period, role: a.role, dataset: a.dataset, summary: a.summary, scenes: a.scenes });

/** An attached PDF is kept in the conversation as a user turn with this prefix and shown as a file block. */
const FILE_PREFIX = "PDF 올림: ";
const isFileTurn = (t: ChatTurn) => t.role === "user" && t.text.startsWith(FILE_PREFIX);
const fileTurnText = (f: File) => `${FILE_PREFIX}${f.name} (${f.size >= 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(f.size / 1024))}KB`})`;
function parseFileTurn(text: string) {
  const body = text.slice(FILE_PREFIX.length);
  const m = body.match(/^(.*) \(([\d.]+(?:MB|KB))\)$/);
  return m ? { name: m[1], size: m[2] } : { name: body, size: "" };
}

/** A GitHub repository read in stage 1 (PORT-06): a user turn with this prefix, shown as a block. */
const REPO_PREFIX = "GitHub 저장소: ";
const isRepoTurn = (t: ChatTurn) => t.role === "user" && t.text.startsWith(REPO_PREFIX);

function RepoBlock({ text, reading }: { text: string; reading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-container border border-border-emphasized bg-bg-surface p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-element bg-bg-tonal" aria-hidden>
        <FolderGit2 className="size-5 text-text-secondary" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-label-strong">{text.slice(REPO_PREFIX.length)}</span>
        <span className={cn("block text-support", reading ? "text-text-ai" : "text-text-secondary")}>
          GitHub 저장소{reading ? ", 저장소를 읽는 중…" : ""}
        </span>
      </span>
    </div>
  );
}

function FileBlock({ text, reading }: { text: string; reading: boolean }) {
  const { name, size } = parseFileTurn(text);
  return (
    <div className="flex items-center gap-3 rounded-container border border-border-emphasized bg-bg-surface p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-element bg-bg-tonal" aria-hidden>
        <FileText className="size-5 text-text-secondary" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-label-strong">{name}</span>
        <span className={cn("block text-support", reading ? "text-text-ai" : "text-text-secondary")}>
          PDF{size ? <span className="figures"> {size}</span> : null}
          {reading ? ", 활동을 읽는 중…" : ""}
        </span>
      </span>
    </div>
  );
}
const rowButton =
  "flex min-h-row-height w-full flex-col items-start justify-center px-4 py-2 text-left hover:bg-overlay-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:text-text-disabled";

function Steps({ stage }: { stage: 1 | 2 }) {
  const step = (n: 1 | 2, label: string) => (
    <li
      aria-current={stage === n ? "step" : undefined}
      className={cn("flex h-control-sm items-center gap-2 rounded-element px-3 text-label", stage === n ? "bg-bg-selected font-semibold text-text-primary" : "text-text-secondary")}
    >
      <span className="figures">{n}</span>
      {label}
    </li>
  );
  return (
    <ol aria-label="진행 단계" className="flex items-center gap-2">
      {step(1, "활동 정하기")}
      <li aria-hidden className="h-px w-6 bg-graph-edge" />
      {step(2, "에피소드 꺼내기")}
    </ol>
  );
}

function ChatLogEntry({ log, open, onCleared }: { log: Log; open: boolean; onCleared: () => void }) {
  return (
    <details className="group scroll-mt-4" open={open} id={`log-${log.key}`}>
      <summary className="flex min-h-row-height cursor-pointer list-none flex-col justify-center px-4 py-2 hover:bg-overlay-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <span className="text-label-strong">{log.title}</span>
        <span className="text-support text-text-secondary">
          {log.theme ? `${EPISODE_THEME_LABEL[log.theme]}, ` : ""}
          {log.turns.length ? <>대화 <span className="figures">{log.turns.length}</span>개</> : "대화 기록 없음"}
        </span>
      </summary>
      {log.turns.length ? (
        <ol className="space-y-2 border-t border-border bg-bg-page px-4 py-3">
          {log.turns.map((t, i) => (
            <li key={i} className="text-support">
              <span className={t.role === "assistant" ? "text-text-ai" : "text-text-secondary"}>{t.role === "assistant" ? "AI 코치 " : "나 "}</span>
              {isFileTurn(t) ? (
                <span className="inline-flex items-center gap-1 rounded-inner bg-bg-tonal px-1.5">
                  <FileText className="size-3.5 text-text-secondary" aria-hidden />
                  {parseFileTurn(t.text).name}
                </span>
              ) : (
                t.text
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-border bg-bg-page px-4 py-3 text-support text-text-secondary">대화 기록이 없는 에피소드예요.</p>
      )}
      {log.turns.length && isSavedId(log.key) ? (
        <div className="border-t border-border bg-bg-page px-4 py-2">
          <ConfirmDelete
            compact
            label="대화 기록 삭제"
            warning="에피소드는 남고, 이 대화 기록만 지워지고 되돌릴 수 없어요."
            onConfirm={() => clearChatLogAction(log.key)}
            onDone={onCleared}
          />
        </div>
      ) : null}
    </details>
  );
}

export function ExperienceChat({ activities: initial, episodes, initialActivityId, initialLogId }: Props) {
  const [activities, setActivities] = useState(initial);
  const [activity, setActivity] = useState<Activity | null>(initial.find((a) => a.id === initialActivityId) ?? null);
  const [turns, setTurns] = useState<ChatTurn[]>(() => {
    const a = initial.find((x) => x.id === initialActivityId);
    return [a ? openEpisode(a) : OPEN_ACTIVITY];
  });
  const [theme, setTheme] = useState<EpisodeTheme | null>(null);
  const [themeHint, setThemeHint] = useState<EpisodeTheme | null>(null); // AI 제안: the answers fit this theme better
  const [dismissed, setDismissed] = useState<Set<EpisodeTheme>>(new Set()); // "그대로 하기" = do not suggest it again
  const [pickingTheme, setPickingTheme] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, EpisodeSuggestion[]>>({});
  const [input, setInput] = useState("");
  const [activityDraft, setActivityDraft] = useState<ActivityOutput | null>(null);
  const [episodeDraft, setEpisodeDraft] = useState<EpisodeDraft | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [cleared, setCleared] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const requested = useRef(new Set<string>());
  const listRef = useRef<HTMLOListElement>(null);

  // 대화 로그로 가기 (from the 카드 tab): bring the opened log into view once
  useEffect(() => {
    if (!initialLogId) return;
    document.getElementById(`log-${initialLogId}`)?.scrollIntoView({ block: "nearest" });
  }, [initialLogId]);
  const answers = turns.filter((t) => t.role === "user").length;
  const shown = activity ? suggestions[activity.id] : undefined;
  const choosing = !!activity && !theme && answers === 0; // suggestions stay until the first answer

  // 추천 에피소드: asked once per activity, as soon as the activity is chosen
  useEffect(() => {
    if (!activity || requested.current.has(activity.id)) return;
    requested.current.add(activity.id);
    const id = activity.id;
    suggestEpisodesAction(toCtx(activity)).then((r) => setSuggestions((s) => ({ ...s, [id]: r.suggestions })));
  }, [activity]);

  // the conversation scrolls inside its window: keep the newest message in view
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [turns, pending, shown, choosing]);

  const activityLogs: Log[] = activity
    ? [
        ...episodes
          .filter((e) => e.activityId === activity.id)
          .map((e) => ({ key: e.id, activityId: activity.id, title: e.title, theme: e.theme, turns: e.chatLog ?? [] })),
        ...logs.filter((l) => l.activityId === activity.id),
      ]
    : [];

  function pickActivity(a: Activity) {
    setThemeHint(null);
    setDismissed(new Set());
    setPickingTheme(false);
    setActivity(a);
    setTheme(null);
    setActivityDraft(null);
    setEpisodeDraft(null);
    setTurns([openEpisode(a)]);
    setNote(null);
  }
  function changeActivity() {
    setThemeHint(null);
    setDismissed(new Set());
    setPickingTheme(false);
    setActivity(null);
    setTheme(null);
    setEpisodeDraft(null);
    setTurns([OPEN_ACTIVITY]);
    setNote(null);
  }

  /** Stage 1 (PORT-06): a GitHub repository address is read into an activity draft; any other address is refused. */
  function readLink(text: string, url: string) {
    const p = parseActivityLink(url);
    if ("error" in p) {
      setTurns((t) => [...t, { role: "user", text }, { role: "assistant", text: p.error }]);
      return;
    }
    setTurns((t) => [...t, { role: "user", text: `${REPO_PREFIX}${p.link.owner}/${p.link.repo}` }]);
    start(async () => {
      const r = await activityFromRepoAction(p.link.url);
      if (r.error) {
        setNote(r.error);
        setTurns((t) => [...t, { role: "assistant", text: `이 저장소에서는 활동을 정리하지 못했어요. ${r.error} 활동을 글로 소개해 주셔도 돼요.` }]);
      } else {
        setActivityDraft(r.draft!);
        setTurns((t) => [...t, { role: "assistant", text: "저장소에서 활동을 정리했어요. 맡은 역할은 저장소만으로는 알 수 없어서 비워 뒀어요. 오른쪽 초안을 확인하고 저장해 주세요." }]);
      }
    });
  }

  function send(say?: string, pickedTheme?: EpisodeTheme) {
    const text = (say ?? input).trim();
    if (!text || pending) return;
    const url = !activity && say === undefined ? findLink(text) : null;
    if (url) {
      setInput("");
      readLink(text, url);
      return;
    }
    const useTheme = pickedTheme ?? theme;
    if (pickedTheme) setTheme(pickedTheme);
    const next = [...turns, { role: "user" as const, text }];
    setTurns(next);
    if (say === undefined) setInput("");
    start(async () => {
      const r = await sendChatAction(next, activity ? toCtx(activity) : null, useTheme);
      if (r.error) setNote(r.error);
      else {
        setTurns([...next, { role: "assistant", text: r.reply! }]);
        // PORT-04: offer a better-fitting theme; the student decides
        setThemeHint(r.betterTheme && r.betterTheme !== useTheme && !dismissed.has(r.betterTheme) ? r.betterTheme : null);
      }
      if (r.demo) setNote("데모 모드: 정해진 질문으로 답해요. AI 키가 연결되면 대화에 맞춰 물어요.");
    });
  }

  /** 테마 바꾸기: said in the chat so the coach continues in the new theme's order without asking again. */
  function switchTheme(t: EpisodeTheme) {
    setThemeHint(null);
    setPickingTheme(false);
    if (t === theme) return;
    send(`${withRo(EPISODE_THEME_LABEL[t])} 바꿀게요.`, t);
  }
  function keepTheme() {
    if (themeHint) setDismissed((d) => new Set(d).add(themeHint));
    setThemeHint(null);
  }

  function attachPdf(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setTurns((t) => [...t, { role: "user", text: fileTurnText(file) }]); // the file block shows right away, "읽는 중" while the AI reads
    start(async () => {
      const r = await activityFromPdfAction(fd);
      if (r.error) {
        setNote(r.error);
        setTurns((t) => [...t, { role: "assistant", text: "이 PDF에서는 활동을 정리하지 못했어요. 다른 파일을 올리거나 활동을 글로 소개해 주세요." }]);
      } else {
        setActivityDraft(r.draft!);
        setTurns((t) => [...t, { role: "assistant", text: "PDF에서 활동을 정리했어요. 오른쪽 초안을 확인하고 저장해 주세요." }]);
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function makeActivityDraft() {
    start(async () => {
      const r = await draftActivityAction(turns);
      if (r.error) setNote(r.error);
      else setActivityDraft(r.draft!);
    });
  }
  function saveActivity() {
    if (!activityDraft) return;
    start(async () => {
      const r = await saveActivityAction(activityDraft);
      if (r.error || !r.activity) return setNote(r.error ?? "활동을 저장하지 못했어요.");
      setActivities((list) => [...list, r.activity!]);
      pickActivity(r.activity);
      setNote(r.ok ?? null);
    });
  }

  function makeEpisodeDraft() {
    if (!activity) return;
    start(async () => {
      const r = await draftEpisodeAction(turns, toCtx(activity), theme);
      if (r.error) setNote(r.error);
      else setEpisodeDraft(r.draft!);
    });
  }
  function saveEpisode() {
    if (!activity || !episodeDraft) return;
    start(async () => {
      const r = (await saveEpisodeAction(episodeDraft, activity.id, turns)) as { ok?: string; error?: string; id?: string };
      setNote(r.ok ?? r.error ?? null);
      if (r.ok) {
        setLogs((l) => [...l, { key: r.id ?? `saved-${Date.now()}`, activityId: activity.id, title: episodeDraft.title, theme: episodeDraft.theme, turns }]);
        setEpisodeDraft(null);
        setTheme(null);
        setTurns([openEpisode(activity, true)]);
        setThemeHint(null);
      }
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <Steps stage={activity ? 2 : 1} />
      <div className="grid gap-px bg-border lg:h-[calc(100dvh-14rem)] lg:max-h-180 lg:min-h-120 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section aria-label="AI 코치와 대화" className="flex h-130 min-h-0 flex-col bg-bg-page py-6 lg:h-full lg:pr-6">
          <ol ref={listRef} className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pl-6 pr-2" aria-live="polite">
            {turns.length ? <SpeakerDot listRef={listRef} index={turns.length - 1} speaker={turns[turns.length - 1].role === "assistant" ? "coach" : "me"} /> : null}
            {turns.map((t, i) => (
              <li key={i} className={cn("max-w-[85%]", t.role === "user" && "ml-auto")}>
                <p className={cn("mb-1 text-caption", t.role === "assistant" ? "text-text-coach" : "text-right text-text-me")}>{t.role === "assistant" ? "AI 코치" : "나"}</p>
                {isFileTurn(t) ? (
                  <div data-bubble={i}>
                    <FileBlock text={t.text} reading={pending && i === turns.length - 1} />
                  </div>
                ) : isRepoTurn(t) ? (
                  <div data-bubble={i}>
                    <RepoBlock text={t.text} reading={pending && i === turns.length - 1} />
                  </div>
                ) : (
                  <p data-bubble={i} className={cn("whitespace-pre-line rounded-container px-4 py-3 text-body", t.role === "user" ? "bg-me-muted" : "bg-coach-muted")}>
                    {t.text}
                  </p>
                )}
              </li>
            ))}
            {choosing && (
              <li aria-label="추천 에피소드" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-label-strong">추천 에피소드</p>
                  {shown?.length ? <TrustLabel p={{ kind: "ai", text: "AI 추천" }} /> : null}
                </div>
                {shown === undefined ? (
                  <div className="space-y-2" aria-label="추천을 만드는 중">
                    <div className="h-row-height animate-pulse rounded-container bg-skeleton-ai" />
                    <div className="h-row-height animate-pulse rounded-container bg-skeleton-ai" />
                  </div>
                ) : shown.length ? (
                  <ul className="divide-y divide-border rounded-container border border-border bg-bg-surface">
                    {shown.map((s) => (
                      <li key={`${s.theme}-${s.title}`}>
                        <button type="button" disabled={pending} onClick={() => send(`${EPISODE_THEME_LABEL[s.theme]}: '${s.title}' 장면으로 할게요.`, s.theme)} className={rowButton}>
                          <span className="text-support text-text-secondary">{EPISODE_THEME_LABEL[s.theme]}</span>
                          <span className="text-label-strong">{s.title}</span>
                          <span className="text-support text-text-secondary">{s.why}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="space-y-2">
                  <p className="text-support text-text-secondary">{shown?.length ? "다른 테마로 시작하기" : "어떤 테마로 꺼낼까요?"}</p>
                  <div className="flex flex-wrap gap-2">
                    {THEMES.map((t) => (
                      <button key={t} type="button" disabled={pending} onClick={() => send(`${EPISODE_THEME_LABEL[t]} 에피소드로 할게요.`, t)} className={cn(btn.outline, btn.sm)}>
                        {EPISODE_THEME_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            )}
            {themeHint && !pending && (
              <li aria-label="테마 바꾸기 제안" className="space-y-3 rounded-container border border-dashed border-border-ai bg-ai-muted p-4">
                <p className="text-caption text-text-ai">AI 코치 제안</p>
                <p className="text-body">
                  지금 이야기는 <span className="font-semibold">{EPISODE_THEME_LABEL[themeHint]}</span>에 더 가까워 보여요. 바꾸면 그 순서로 이어서 물어요.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => switchTheme(themeHint)} className={cn(btn.primary, btn.sm)}>
                    {withRo(EPISODE_THEME_LABEL[themeHint])} 바꾸기
                  </button>
                  <button type="button" onClick={keepTheme} className={cn(btn.ghost, btn.sm)}>
                    그대로 하기
                  </button>
                </div>
              </li>
            )}
            {pending && <li className="h-3 w-40 animate-pulse rounded-inner bg-skeleton-ai" aria-label="답을 만드는 중" />}
          </ol>
          <form
            className="mt-4 flex gap-2 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            {!activity && (
              <>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" id="activity-pdf" onChange={(e) => attachPdf(e.target.files?.[0])} />
                <label htmlFor="activity-pdf" className={cn(btn.ghost, "cursor-pointer")} title="PDF로 활동 올리기">
                  <Paperclip className="size-4" aria-hidden />
                  <span className="sr-only">PDF로 활동 올리기</span>
                </label>
              </>
            )}
            <label className="sr-only" htmlFor="chat-input">메시지</label>
            <input
              id="chat-input"
              autoComplete="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activity ? "답을 적어 주세요" : "활동을 소개해 주세요 (예: 카페 아르바이트, 2024년 6월부터)"}
              className="h-control-md w-0 min-w-0 flex-1 rounded-element border border-border-emphasized bg-bg-surface px-3 text-body outline-none focus:border-accent"
            />
            <button type="submit" disabled={pending} className={btn.primary} aria-label="보내기">
              <Send className="size-4" aria-hidden />
            </button>
          </form>
          {note && (
            <p role="status" className="mt-2 flex flex-wrap items-center gap-2 text-caption text-text-secondary">
              {note}
              {/패스가 있으면/.test(note) ? <Link href="/billing" className="text-label underline underline-offset-2">패스 보기</Link> : null}
            </p>
          )}
        </section>

        <aside className="space-y-6 bg-bg-sunken p-5 lg:min-h-0 lg:overflow-y-auto">
          {!activity ? (
            <>
              {activities.length > 0 && (
                <section className="space-y-2">
                  <Kicker>저장한 활동에서 고르기</Kicker>
                  <ul className="divide-y divide-border rounded-container border border-border bg-bg-surface">
                    {activities.map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => pickActivity(a)} className={rowButton}>
                          <span className="text-label-strong">{a.title}</span>
                          <span className="text-support text-text-secondary">
                            {EXPERIENCE_KIND_LABEL[a.kind]}
                            {a.period ? <span className="figures"> {a.period}</span> : null}
                            {a.scenes?.length ? <span>, 장면 후보 <span className="figures">{a.scenes.length}</span>개</span> : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="space-y-3">
                <Kicker right={activityDraft ? <TrustLabel p={{ kind: "ai", text: "AI 요약" }} /> : undefined}>새 활동</Kicker>
                {!activityDraft ? (
                  <>
                    <p className="text-body text-text-secondary">대화로 소개하거나, 클립 버튼으로 PDF를 올리거나, GitHub 저장소 주소를 붙여넣으면 활동 카드 초안을 만들어요.</p>
                    <button type="button" onClick={makeActivityDraft} disabled={pending || answers < 1} className={btn.secondary}>
                      활동 카드 만들기
                    </button>
                  </>
                ) : (
                  <div className="space-y-3 rounded-container border border-border bg-bg-surface p-4">
                    <p className="text-support text-text-secondary">
                      {EXPERIENCE_KIND_LABEL[activityDraft.kind]}
                      {activityDraft.period ? <span className="figures"> {activityDraft.period}</span> : null}
                    </p>
                    <p className="text-heading-3">{activityDraft.title}</p>
                    {activityDraft.role ? <p className="text-body"><span className="text-label text-text-secondary">맡은 역할 </span>{activityDraft.role}</p> : null}
                    {activityDraft.dataset ? <p className="text-body"><span className="text-label text-text-secondary">사용한 데이터 </span>{activityDraft.dataset}</p> : null}
                    {activityDraft.link ? (
                      <a href={activityDraft.link} target="_blank" rel="noreferrer" className="block truncate text-label underline underline-offset-2">
                        GitHub 저장소 {activityDraft.link.replace("https://github.com/", "")}
                      </a>
                    ) : null}
                    <p className="text-body text-text-secondary">{activityDraft.summary || "요약이 비어 있어요"}</p>
                    {activityDraft.scenes?.length ? (
                      <div className="space-y-1">
                        <p className="text-label text-text-secondary">에피소드로 꺼낼 만한 장면</p>
                        <ul className="list-disc space-y-0.5 pl-5 text-body">
                          {activityDraft.scenes.map((s) => <li key={s.title}>{s.title}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={saveActivity} disabled={pending} className={btn.primary}>활동 저장하고 에피소드 꺼내기</button>
                      <button type="button" onClick={() => setActivityDraft(null)} className={btn.ghost}>다시 대화하기</button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <Kicker right={<button type="button" onClick={changeActivity} className={cn(btn.ghost, btn.sm)}>활동 바꾸기</button>}>정리 중인 활동</Kicker>
                <ActivityTile activity={activity} />
                {activity.dataset ? (
                  <p className="text-support">
                    <span className="text-text-secondary">사용한 데이터 </span>
                    {activity.dataset}
                  </p>
                ) : null}
                {activity.summary ? <p className="text-support text-text-secondary">{activity.summary}</p> : null}
              </section>
              <section className="space-y-3">
                <Kicker right={episodeDraft ? <TrustLabel p={{ kind: "ai", text: "AI 요약" }} /> : undefined}>에피소드 초안</Kicker>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-label">
                      테마{" "}
                      {theme ? (
                        <span className="rounded-inner bg-bg-tonal px-2 text-data-sm leading-6">{EPISODE_THEME_LABEL[theme]}</span>
                      ) : (
                        <span className="text-text-secondary">아직 안 정했어요</span>
                      )}
                    </p>
                    <button type="button" onClick={() => setPickingTheme((v) => !v)} aria-expanded={pickingTheme} className={cn(btn.ghost, btn.sm)}>
                      {theme ? "바꾸기" : "정하기"}
                    </button>
                  </div>
                  {pickingTheme && (
                    <div role="group" aria-label="테마 고르기" className="flex flex-wrap gap-1.5">
                      {THEMES.map((t) => (
                        <button key={t} type="button" aria-pressed={t === theme} disabled={pending} onClick={() => switchTheme(t)} className={cn("h-control-sm rounded-element border px-2.5 text-label", t === theme ? "border-bg-selected bg-bg-selected font-semibold text-text-primary" : "border-border-emphasized text-text-secondary hover:bg-overlay-hover")}>
                          {EPISODE_THEME_LABEL[t]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!episodeDraft ? (
                  <>
                    <p className="text-body text-text-secondary">몇 번 주고받은 뒤 초안을 만들어요. 말하지 않은 내용은 채우지 않아요.</p>
                    <button type="button" onClick={makeEpisodeDraft} disabled={pending || answers < 2} className={btn.secondary}>
                      에피소드 초안 만들기
                    </button>
                  </>
                ) : (
                  <div className="space-y-3 rounded-container border border-border bg-bg-surface p-4">
                    <div role="radiogroup" aria-label="에피소드 테마" className="flex flex-wrap gap-1.5">
                      {THEMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          aria-checked={episodeDraft.theme === t}
                          onClick={() => {
                            setEpisodeDraft({ ...episodeDraft, theme: t });
                            setTheme(t);
                          }}
                          className={cn("h-control-sm rounded-element border px-2.5 text-label", episodeDraft.theme === t ? "border-bg-selected bg-bg-selected font-semibold text-text-primary" : "border-border-emphasized text-text-secondary hover:bg-overlay-hover")}
                        >
                          {EPISODE_THEME_LABEL[t]}
                        </button>
                      ))}
                    </div>
                    <p className="text-heading-3">{episodeDraft.title}</p>
                    <dl className="space-y-2">
                      {([
                        ["상황", episodeDraft.situation],
                        ["맡은 일", episodeDraft.role],
                        ["행동", episodeDraft.action],
                        ["결과", episodeDraft.result],
                        ["배운 점", episodeDraft.learning],
                      ] as const).map(([k, v]) => (
                        <div key={k} className="space-y-0.5">
                          <dt className="text-label text-text-secondary">{k}</dt>
                          <dd className={cn("text-body", !v && "text-text-secondary")}>{v || "비어 있어요"}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={saveEpisode} disabled={pending} className={btn.primary}>에피소드 저장</button>
                      <button type="button" onClick={() => setEpisodeDraft(null)} className={btn.ghost}>다시 대화하기</button>
                    </div>
                  </div>
                )}
              </section>
              <section className="space-y-2">
                <Kicker right={<Link href="/manage?tab=cards" className={cn(btn.ghost, btn.sm)}>카드에서 보기</Link>}>대화 기록</Kicker>
                {activityLogs.length ? (
                  <ul className="divide-y divide-border rounded-container border border-border bg-bg-surface">
                    {activityLogs.map((log) => (
                      <li key={log.key}>
                        <ChatLogEntry
                          log={cleared.has(log.key) ? { ...log, turns: [] } : log}
                          open={log.key === initialLogId}
                          onCleared={() => setCleared((s) => new Set(s).add(log.key))}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-support text-text-secondary">에피소드를 저장하면 그 대화가 여기에 쌓여요.</p>
                )}
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
