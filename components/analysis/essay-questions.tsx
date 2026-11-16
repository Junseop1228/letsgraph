"use client";
// 지원서 문항 (specs/prompt-kit FR-PREM-04): paste the application form, check what the AI read (fix the type, drop a
// line), then save it on the posting; the kit then follows the real questions. The pasted text goes to an AI (NFR-EXT-05).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { parseQuestionsAction, saveQuestionsAction } from "@/app/(main)/connect/actions";
import { QUESTION_TYPE_LABEL, QuestionType, type EssayQuestion } from "@/lib/contracts/activity";
import { btn, Kicker, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = { postingId: string; saved: EssayQuestion[] };
const fmt = (n: number) => new Intl.NumberFormat("ko-KR").format(n);
const limits = (q: EssayQuestion) => [q.maxChars ? `최대 ${fmt(q.maxChars)}자` : "", q.minChars ? `최소 ${fmt(q.minChars)}자` : ""].filter(Boolean).join(", ");

function QuestionRow({ q, n, onType, onRemove }: { q: EssayQuestion; n: number; onType?: (t: QuestionType) => void; onRemove?: () => void }) {
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
    </li>
  );
}

export function EssayQuestions({ postingId, saved }: Props) {
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

  return (
    <section className="space-y-3 border-b border-border pb-5" aria-labelledby="essay-questions">
      <Kicker right={mode === "check" ? <TrustLabel p={{ kind: "ai", text: "AI가 읽음" }} /> : undefined}>
        <span id="essay-questions">지원서 문항</span>
      </Kicker>

      {mode === "view" && (
        <>
          <ol className="divide-y divide-border rounded-container border border-border bg-bg-surface">
            {saved.map((q, i) => (
              <QuestionRow key={q.id} q={q} n={i + 1} />
            ))}
          </ol>
          <button type="button" onClick={() => setMode("paste")} className={cn(btn.ghost, btn.sm)}>
            다시 붙여넣기
          </button>
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
              이 문항으로 저장
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
