"use server";
// 카드 지우기 (specs/portfolio PORT-05): 활동, 에피소드, 대화 기록. Own rows only (RLS); nothing is kept after deletion.
// Deleting an activity also deletes its episodes and their conversation logs (foreign key on delete cascade).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseEnabled } from "@/lib/data";
import { logAiFailure } from "@/lib/ai/clamp";

type Result = { ok?: string; error?: string };
const Id = z.string().uuid();

/** Signed-in session and a valid id, or the message to show. */
async function prepare(id: unknown, what: string) {
  if (!supabaseEnabled()) return { error: "데모 모드에서는 지우지 않아요." } as const;
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "로그인하면 지울 수 있어요." } as const;
  const p = Id.safeParse(id);
  if (!p.success) return { error: `지울 ${what}을 찾지 못했어요.` } as const;
  return { db, id: p.data } as const;
}

export async function deleteActivityAction(id: string): Promise<Result> {
  const g = await prepare(id, "활동");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.db.from("activities").delete().eq("id", g.id).select("id");
  if (error) {
    logAiFailure("delete_activity", error);
    return { error: "활동을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  if (!data?.length) return { error: "지울 활동을 찾지 못했어요." };
  revalidatePath("/manage");
  return { ok: "활동과 그 에피소드를 지웠어요." };
}

export async function deleteEpisodeAction(id: string): Promise<Result> {
  const g = await prepare(id, "에피소드");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.db.from("experiences").delete().eq("id", g.id).select("id");
  if (error) {
    logAiFailure("delete_episode", error);
    return { error: "에피소드를 지우지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  if (!data?.length) return { error: "지울 에피소드를 찾지 못했어요." };
  revalidatePath("/manage");
  return { ok: "에피소드를 지웠어요." };
}

/** Empties the conversation log of an episode; the episode itself stays. */
export async function clearChatLogAction(id: string): Promise<Result> {
  const g = await prepare(id, "대화 기록");
  if ("error" in g) return { error: g.error };
  const { data, error } = await g.db.from("experiences").update({ chat_log: [] }).eq("id", g.id).select("id");
  if (error) {
    logAiFailure("clear_chat_log", error);
    return { error: "대화 기록을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  if (!data?.length) return { error: "지울 대화 기록을 찾지 못했어요." };
  revalidatePath("/manage");
  return { ok: "대화 기록을 지웠어요." };
}
