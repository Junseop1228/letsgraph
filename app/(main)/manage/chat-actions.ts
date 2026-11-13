"use server";
// 경험 대화 서버 액션 (specs/portfolio PORT-02). Without an AI key the demo script answers instead.
import { z } from "zod";
import { supabaseEnabled } from "@/lib/data";
import { aiEnabled } from "@/lib/ai/tasks";
import { chatReply, draftExperience, type ChatTurn } from "@/lib/ai/chat";
import { ExperienceOutput } from "@/lib/contracts/activity";

const History = z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(40);

const DEMO_QUESTIONS = [
  "좋아요. 그 일에서 처음에 어떤 문제가 있었나요?",
  "그때 본인이 맡은 역할은 무엇이었어요?",
  "문제를 풀려고 직접 한 행동을 순서대로 말해 줄래요?",
  "그래서 무엇이 달라졌나요? 숫자로 말할 수 있으면 더 좋아요.",
  "정리할 준비가 됐어요. '카드 초안 만들기'를 눌러 보세요.",
];

export async function sendChatAction(history: ChatTurn[]): Promise<{ reply?: string; error?: string; demo?: boolean }> {
  const h = History.safeParse(history);
  if (!h.success) return { error: "대화가 너무 길어요. 카드로 정리한 뒤 새로 시작해 주세요." };
  if (!aiEnabled()) {
    const asked = h.data.filter((t) => t.role === "assistant").length - 1; // opening question is not scripted
    return { reply: DEMO_QUESTIONS[Math.min(Math.max(0, asked), DEMO_QUESTIONS.length - 1)], demo: true };
  }
  try {
    return { reply: await chatReply(h.data) };
  } catch {
    return { error: "답을 만들지 못했어요. 잠시 뒤 다시 보내 주세요." };
  }
}

export async function draftCardAction(history: ChatTurn[]): Promise<{ draft?: z.infer<typeof ExperienceOutput>; error?: string; demo?: boolean }> {
  const h = History.safeParse(history);
  if (!h.success) return { error: "대화를 읽지 못했어요." };
  const userText = h.data.filter((t) => t.role === "user").map((t) => t.text);
  if (!aiEnabled()) {
    // demo: arrange the user's own answers without adding facts
    return {
      demo: true,
      draft: {
        title: (userText[0] ?? "새 경험").slice(0, 40),
        kind: "other",
        situation: userText[1] ?? "",
        action: [userText[2], userText[3]].filter(Boolean).join(" "),
        result: userText[4] ?? "수치는 직접 확인해서 넣어요",
        competencies: [],
      },
    };
  }
  try {
    return { draft: await draftExperience(h.data) };
  } catch {
    return { error: "카드 초안을 만들지 못했어요." };
  }
}

export async function saveCardAction(draft: unknown): Promise<{ ok?: string; error?: string }> {
  const d = ExperienceOutput.safeParse(draft);
  if (!d.success) return { error: "카드 내용이 올바르지 않아요." };
  if (!supabaseEnabled()) return { error: "데모 모드에서는 저장하지 않아요. 로그인이 연결되면 저장돼요." };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { error: "로그인이 필요해요." };
  const { error } = await db.from("experiences").insert({ ...d.data, user_id: uid, source_label: "경험 대화" });
  return error ? { error: "저장하지 못했어요." } : { ok: "경험 카드로 저장했어요." };
}
