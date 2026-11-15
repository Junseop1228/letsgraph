// 경험 대화 (specs/portfolio PORT-02): a coach that asks one question at a time, then drafts an experience card.
import "server-only";
import { generateText, Output, type ModelMessage } from "ai";
import { google } from "@ai-sdk/google";
import { ExperienceOutput } from "@/lib/contracts/activity";
import { AI_MODEL, aiEnabled, AiUnavailable } from "@/lib/ai/tasks";

export type ChatTurn = { role: "user" | "assistant"; text: string };

const SYSTEM = `너는 대학생의 경험을 정리해 주는 코치다. 한 번에 질문 하나만, 해요체로 짧게 묻는다.
상황 → 내가 맡은 일 → 한 행동 → 결과(수치가 있으면 수치) 순서로 빠진 것을 묻는다.
학생이 말하지 않은 사실이나 숫자를 지어내지 않는다. 이름, 연락처 같은 개인정보는 묻지 않는다.`;

const toMessages = (h: ChatTurn[]): ModelMessage[] => h.map((t) => ({ role: t.role, content: t.text }));

export async function chatReply(history: ChatTurn[]): Promise<string> {
  if (!aiEnabled()) throw new AiUnavailable();
  const res = await generateText({ model: google(AI_MODEL), system: SYSTEM, messages: toMessages(history.slice(-20)), abortSignal: AbortSignal.timeout(30_000) });
  return res.text.trim();
}

export async function draftExperience(history: ChatTurn[]) {
  if (!aiEnabled()) throw new AiUnavailable();
  const res = await generateText({
    model: google(AI_MODEL),
    system: `${SYSTEM}\n지금까지의 대화를 경험 카드 하나로 요약한다. 대화에 없는 내용은 비워 둔다.`,
    messages: toMessages(history.slice(-30)),
    output: Output.object({ schema: ExperienceOutput }),
    abortSignal: AbortSignal.timeout(30_000),
  });
  return ExperienceOutput.parse(res.output);
}
