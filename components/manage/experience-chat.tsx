"use client";
// 경험 대화 화면 (specs/portfolio PORT-02). The AI speaker is labelled; the draft card is shown before saving.
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { draftCardAction, saveCardAction, sendChatAction } from "@/app/(main)/manage/chat-actions";
import type { ChatTurn } from "@/lib/ai/chat";
import { btn, Kicker, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Draft = NonNullable<Awaited<ReturnType<typeof draftCardAction>>["draft"]>;

const FIRST: ChatTurn = { role: "assistant", text: "정리하고 싶은 경험이 있나요? 활동 이름과 기간부터 알려 주세요." };

export function ExperienceChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([FIRST]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    const text = input.trim();
    if (!text) return;
    const next = [...turns, { role: "user" as const, text }];
    setTurns(next);
    setInput("");
    start(async () => {
      const r = await sendChatAction(next);
      if (r.error) setNote(r.error);
      else setTurns([...next, { role: "assistant", text: r.reply! }]);
      if (r.demo) setNote("데모 모드: 정해진 질문으로 답해요. AI 키가 연결되면 대화에 맞춰 물어요.");
    });
  }
  function makeDraft() {
    start(async () => {
      const r = await draftCardAction(turns);
      if (r.error) setNote(r.error);
      else setDraft(r.draft!);
    });
  }
  function save() {
    if (!draft) return;
    start(async () => {
      const r = await saveCardAction(draft);
      setNote(r.ok ?? r.error ?? null);
    });
  }

  return (
    <div className="grid gap-px bg-border py-0 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <section className="flex min-h-[520px] flex-col bg-bg-page py-6 lg:pr-6">
        <ol className="flex-1 space-y-4" aria-live="polite">
          {turns.map((t, i) => (
            <li key={i} className={cn("max-w-[85%]", t.role === "user" && "ml-auto")}>
              <p className={cn("mb-1 text-caption", t.role === "assistant" ? "text-text-ai" : "text-right text-text-secondary")}>{t.role === "assistant" ? "AI 코치" : "나"}</p>
              <p className={cn("rounded-container px-4 py-3 text-body", t.role === "user" ? "bg-bg-tonal" : "border-l-[3px] border-ai bg-bg-page pl-4")}>{t.text}</p>
            </li>
          ))}
          {pending && <li className="h-3 w-40 animate-pulse rounded-inner bg-skeleton-ai" aria-label="답을 만드는 중" />}
        </ol>
        <form
          className="mt-4 flex gap-2 border-t border-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="sr-only" htmlFor="chat-input">메시지</label>
          <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="답을 적어 주세요" className="h-control-md flex-1 rounded-element border border-border-emphasized bg-bg-surface px-3 text-body outline-none focus:border-accent" />
          <button type="submit" disabled={pending} className={btn.primary} aria-label="보내기"><Send className="size-4" aria-hidden /></button>
        </form>
        {note && <p role="status" className="mt-2 text-caption text-text-secondary">{note}</p>}
      </section>
      <aside className="space-y-4 bg-bg-sunken p-5">
        <Kicker right={draft ? <TrustLabel p={{ kind: "ai", text: "AI 요약" }} /> : undefined}>카드 초안</Kicker>
        {!draft ? (
          <>
            <p className="text-body text-text-secondary">대화를 몇 번 주고받은 뒤 카드 초안을 만들어요. 말하지 않은 내용은 채우지 않아요.</p>
            <button type="button" onClick={makeDraft} disabled={pending || turns.filter((t) => t.role === "user").length < 2} className={btn.secondary}>카드 초안 만들기</button>
          </>
        ) : (
          <div className="space-y-3 rounded-container border border-border bg-bg-surface p-4">
            <p className="text-heading-3">{draft.title}</p>
            <dl className="space-y-1 text-body">
              {[["상황", draft.situation], ["행동", draft.action], ["결과", draft.result]].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[40px_1fr] gap-2"><dt className="text-label text-text-secondary">{k}</dt><dd>{v || "—"}</dd></div>
              ))}
            </dl>
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={pending} className={btn.primary}>경험 카드로 저장</button>
              <button type="button" onClick={() => setDraft(null)} className={btn.ghost}>다시 대화하기</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
