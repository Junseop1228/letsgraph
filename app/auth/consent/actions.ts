"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Consent } from "@/lib/contracts/account";

export type ConsentState = { error?: string } | undefined;

/** Creates the profile only when every required item is agreed (FR-ACCT-01 E2). */
export async function saveConsentAction(_prev: ConsentState, form: FormData): Promise<ConsentState> {
  const parsed = Consent.safeParse({ terms: form.get("terms") === "on", privacy: form.get("privacy") === "on", ai: form.get("ai") === "on" });
  if (!parsed.success) return { error: "필수 항목에 모두 동의해야 계정을 만들 수 있어요." };
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/auth/login");
  const { error } = await db.from("profiles").upsert({ user_id: uid, consent: parsed.data, consented_at: new Date().toISOString() });
  if (error) return { error: "저장하지 못했어요. 다시 시도해 주세요." };
  const nextRaw = String(form.get("next") ?? "/explore");
  redirect(nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/explore");
}
