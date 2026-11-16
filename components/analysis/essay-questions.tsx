"use client";
// 지원서 문항 (specs/prompt-kit FR-PREM-04): paste the application form, check what the AI read (fix the type, drop a
// line), then save it on the posting; the kit then follows the real questions. The pasted text goes to an AI (NFR-EXT-05).
// FR-PREM-05: saved questions show the episode the AI matched by content and why (or the scene that is missing);
// the user can pick another episode, hand it back to the AI, or match again after making new episodes.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { parseQuestionsAction, rematchQuestionsAction, saveQuestionsAction, setQuestionEpisodeAction } from "@/app/(main)/connect/actions";
import { QUESTION_TYPE_LABEL, QuestionType, type EssayQuestion } from "@/lib/contracts/activity";
import { btn, Kicker, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type EpisodeOption = { id: string; title: string };
type Props = { postingId: string; saved: EssayQuestion[]; episodes: EpisodeOption[] };
const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const limits = (q: EssayQuestion) => [q.maxChars ? `최대 ${fmt(q.maxChars)}자` : "", q.minChars ? `최소 ${fmt(q.minChars)}자` : ""].filter(Boolean).join(", ");

function Match({ q, episodes, busy, onChoose }: { q: EssayQuestion; episodes: EpisodeOption[]; busy: boolean; onChoose: (choice: string) => void }) {
  if (q.type === "career") return <p className="text-support text-text-secondary">경력기술서는 활동(경력 재료)으로 써요.</p>;
  const titles = (q.episodeIds ?? []).flatMap((id) => episodes.find((e) => e.id === id)?.title ?? []);
  return (
    <div className="space-y-1.5 rounded-element bg-bg-sunken px-3 py-2">
      {q.episodeIds === undefined ? (
        <p className="text-support text-text-secondary">아직 잇지 않았어요. 테마로 배정해요.</p>
      ) : titles.length ? (
        <p className="text-support">
          <span className="text-text-secondary">{q.manual ? "직접 고른 에피소드 " : "이어진 에피소드 "}</span>
          <span className="font-semibold">{titles.join(", ")}</span>
          {q.fit && !q.manual ? <span className="block text-text-secondary">{q.fit}</span> : null}
        </p>
      ) : (
        <p className="text-support">
          <span className="text-text-secondary">맞는 에피소드가 없어요. </span>
          {q.need ? <span className="block">필요한 장면: {q.need}</span> : null}
          <Link href="/manage?tab=chat" className="text-label underline underline-offset-2">에피소드 꺼내러 가기</Link>
        </p>
      )}
      <label className="flex flex-wrap items-center gap-2 text-support text-text-secondary">
        다른 에피소드로
        <select
          value=""
          disabled={busy}
          onChange={(e) => e.target.value !== "" && onChoose(e.target.value === "none" ? "" : e.target.value)}
          className="h-control-sm max-w-full rounded-element border border-border-emphasized bg-bg-surface px-2 text-label text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="">골라 주세요</option>
          {q.manual ? <option value="auto">AI 추천으로 되돌리기</option> : null}
          <option value="none">에피소드 없이 쓰기</option>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function QuestionRow({ q, n, onType, onRemove, children }: { q: EssayQuestion; n: number; onType?: (t: QuestionType) => void; onRemove?: () => void; children?: React.ReactNode }) {
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="figures text-label text-text-secondary">{n}</span>
        {onType ? (
          <label className="flex items-center gap-1 text-label">
            <span className="sr-only">문항 {n} 유형</span>
            <select
              value={q.type}
              onChange={(e) => onType(e.target.value as QuestionType)}
              className="h-control-sm rounded-element border border-border-emphasized bg-bg-surface px-2 text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {QuestionType.options.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="rounded-inner bg-bg-tonal px-2 text-data-sm leading-6">{QUESTION_TYPE_LABEL[q.type]}</span>
        )}
        {limits(q) ? <span className="figures text-support text-text-secondary">{limits(q)}</span> : null}
        {onRemove ? (
          <button type="button" onClick={onRemove} aria-label={`문항 ${n} 빼기`} className={cn(btn.ghost, btn.sm, "ml-auto")}>
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <p className="text-body">{q.text}</p>
      {children}
    </li>
  );
}

export function EssayQuestions({ postingId, saved, episodes }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "paste" | "check">(saved.length ? "view" : "paste");
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<EssayQuestion[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function read() {
    start(async () => {
      const r = await parseQuestionsAction(text);
      if (r.error || !r.questions) return setNote(r.error ?? "문항을 읽지 못했어요.");
      setDraft(r.questions);
      setMode("check");
      setNote(null);
    });
  }
  function save() {
    start(async () => {
      const r = await saveQuestionsAction(postingId, draft);
      setNote(r.ok ?? r.error ?? null);
      if (r.ok) {
        setMode("view");
        router.refresh();
      }
    });
  }

  function choose(questionId: string, choice: string) {
    start(async () => {
      const r = await setQuestionEpisodeAction(postingId, questionId, choice);
      setNote(r.ok ?? r.error ?? null);
      if (r.ok) router.refresh();
    });
  }
  function rematch() {
    start(async () => {
      const r = await rematchQuestionsAction(postingId);
      setNote(r.ok ?? r.error ?? null);
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className="space-y-3 border-b border-border pb-5" aria-labelledby="essay-questions">
      <Kicker right={mode === "check" ? <TrustLabel p={{ kind: "ai", text: "AI가 읽음" }} /> : undefined}>
        <span id="essay-questions">지원서 문항</span>
      </Kicker>

      {mode === "view" && (
        <>
          <ol className="divide-y divide-border rounded-container border border-border bg-bg-surface">
            {saved.map((q, i) => (
              <QuestionRow key={q.id} q={q} n={i + 1}>
                <Match q={q} episodes={episodes} busy={pending} onChoose={(c) => choose(q.id, c)} />
              </QuestionRow>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={rematch} disabled={pending} className={cn(btn.secondary, btn.sm)}>
              {pending ? "잇는 중…" : "에피소드 다시 잇기"}
            </button>
            <button type="button" onClick={() => setMode("paste")} className={cn(btn.ghost, btn.sm)}>
              다시 붙여넣기
            </button>
          </div>
        </>
      )}

      {mode === "paste" && (
        <div className="space-y-3">
          <label htmlFor="essay-paste" className="block text-body text-text-secondary">
            지원서 화면에서 문항 부분을 통째로 복사해 붙여넣으면, 문항과 글자 수를 읽어서 키트를 문항에 맞춰요.
          </label>
          <textarea
            id="essay-paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={20000}
            placeholder={"예)\n필수 [회사명] 직장 경험 중 가장 큰 성과를 냈던 일과 본인의 강점에 대해 작성해주세요.\n0/5000"}
            className="block w-full resize-y rounded-container border border-border-emphasized bg-bg-surface p-3 text-body outline-none placeholder:text-text-secondary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-caption text-text-secondary">안내 문구나 버튼 글자가 섞여도 괜찮아요. 붙여넣은 내용은 문항을 읽으려고 생성형 AI(Gemini)로 보내요.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={read} disabled={pending || text.trim().length < 10} className={btn.primary}>
              {pending ? "읽는 중…" : "문항 읽기"}
            </button>
            {saved.length ? (
              <button type="button" onClick={() => setMode("view")} className={btn.ghost}>
                취소
              </button>
            ) : null}
          </div>
        </div>
      )}

      {mode === "check" && (
        <div className="space-y-3">
          <p className="text-body text-text-secondary">읽은 문항이 맞는지 확인하고, 유형이 다르면 고쳐 주세요.</p>
          <ol className="divide-y divide-border rounded-container border border-border bg-bg-surface">
            {draft.map((q, i) => (
              <QuestionRow
                key={q.id}
                q={q}
                n={i + 1}
                onType={(t) => setDraft((d) => d.map((x) => (x.id === q.id ? { ...x, type: t } : x)))}
                onRemove={() => setDraft((d) => d.filter((x) => x.id !== q.id))}
              />
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={pending || !draft.length} className={btn.primary}>
              {pending ? "저장하고 에피소드 잇는 중…" : "이 문항으로 저장"}
            </button>
            <button type="button" onClick={() => setMode("paste")} className={btn.ghost}>
              다시 붙여넣기
            </button>
          </div>
        </div>
      )}

      {note && (
        <p role="status" className="text-label text-text-secondary">
          {note}
        </p>
      )}
    </section>
  );
}
