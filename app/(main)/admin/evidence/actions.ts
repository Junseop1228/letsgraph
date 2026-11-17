"use server";
// 공고 근거 관리 (specs/safety SAFE-03): an admin removes wrong or abusive evidence. A job <-> company link (and a
// job <-> division link) made from evidence is removed too once no evidence for it is left. Admin only.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = { id: string; job_role_id: string; company_id: string; segment_id: string | null };
type Db = ReturnType<typeof createAdminClient>;

/** Links with no evidence left go; 'estimated' links and hand-made seed links without evidence rows are not touched. */
async function cleanUp(db: Db, rows: Row[]) {
  const pairs = new Map(rows.map((r) => [`${r.job_role_id}|${r.company_id}`, r]));
  for (const r of pairs.values()) {
    const { count } = await db.from("job_link_evidence").select("id", { count: "exact", head: true }).eq("job_role_id", r.job_role_id).eq("company_id", r.company_id);
    if (!count) await db.from("job_links").delete().eq("job_role_id", r.job_role_id).eq("company_id", r.company_id).eq("basis", "posting");
  }
  const segs = new Map(rows.filter((r) => r.segment_id).map((r) => [`${r.job_role_id}|${r.segment_id}`, r]));
  for (const r of segs.values()) {
    const { count } = await db.from("job_link_evidence").select("id", { count: "exact", head: true }).eq("job_role_id", r.job_role_id).eq("segment_id", r.segment_id!);
    if (!count) await db.from("segment_job_roles").delete().eq("job_role_id", r.job_role_id).eq("segment_id", r.segment_id!);
  }
}

export async function deleteEvidenceAction(id: string): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db.from("job_link_evidence").delete().eq("id", String(id)).select("id, job_role_id, company_id, segment_id");
  if (error) return { error: "지우지 못했어요." };
  await cleanUp(db, (data ?? []) as Row[]);
  revalidatePath("/admin/evidence");
  return { ok: "근거를 지웠어요." };
}

export async function deleteByCreatorAction(hash: string): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  if (!/^[0-9a-f]{16}$/.test(String(hash))) return { error: "흔적 값이 올바르지 않아요." };
  const db = createAdminClient();
  const { data, error } = await db.from("job_link_evidence").delete().eq("creator_hash", hash).select("id, job_role_id, company_id, segment_id");
  if (error) return { error: "지우지 못했어요." };
  await cleanUp(db, (data ?? []) as Row[]);
  revalidatePath("/admin/evidence");
  return { ok: `같은 사람이 만든 근거 ${data?.length ?? 0}개를 지웠어요.` };
}
