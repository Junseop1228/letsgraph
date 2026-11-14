"use server";
// 회원 탈퇴 (specs/account FR-ACCT-05). Deleting the auth user cascades every user table; orders keep the
// payment record with user_id set to null (legal retention). Requires the confirmation phrase.
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/data";

export type DeleteState = { error?: string } | undefined;

export async function deleteAccountAction(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  if (form.get("confirm") !== "탈퇴합니다") return { error: "확인 문구를 정확히 입력해 주세요." }; // E1: nothing is deleted
  if (!supabaseEnabled()) return { error: "데모 모드에는 계정이 없어서 지울 것이 없어요." };
  const { createClient } = await import("@/lib/supabase/server");
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return { error: "로그인이 필요해요." };
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { error } = await createAdminClient().auth.admin.deleteUser(uid);
  if (error) return { error: "탈퇴를 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  await db.auth.signOut();
  redirect("/explore?bye=1");
}
