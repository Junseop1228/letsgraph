"use server";
// 회사 직무 소개 가져오기 (specs/data-pipeline FR-OPS-04). Admin only: every action checks the session first.
// read: one public page (same guard as posting URLs: public http/https only, 10 s, 5 MB, no crawling) -> jobs to confirm.
// save: company_jobs rows, evidence (method company_page) and confirmed job <-> company links.
// delete: removes one imported page; a link with no evidence left is removed too.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { aiEnabled, extractCompanyJobs } from "@/lib/ai/tasks";
import { logAiFailure } from "@/lib/ai/clamp";
import { fetchPostingFromUrl, PostingFetchError } from "@/lib/posting/fetch";
import { catalog } from "@/lib/data";
import { matchCompany } from "@/lib/posting/company";
import { createAdminClient } from "@/lib/supabase/admin";
import { domainOf } from "@/lib/posting/evidence-check";
import { CompanyJobsSave, type CompanyJobDraft } from "@/lib/contracts/company-jobs";
import { JOBS } from "@/lib/reference/jobs";

export type ReadResult = {
  url?: string;
  companyName?: string;
  company?: { id: string; name: string } | null;
  jobs?: CompanyJobDraft[];
  error?: string;
};

export async function readCompanyJobsAction(rawUrl: string): Promise<ReadResult> {
  await requireAdmin();
  if (!aiEnabled()) return { error: "AI 키가 연결돼야 페이지를 읽을 수 있어요." };
  let page;
  try {
    page = await fetchPostingFromUrl(String(rawUrl ?? ""));
  } catch (e) {
    return { error: e instanceof PostingFetchError ? e.message : "페이지를 읽지 못했어요." };
  }
  if (page.kind !== "text") return { error: "HTML 페이지만 읽을 수 있어요. 직무 소개 페이지 주소를 넣어 주세요." };
  try {
    const { companyName, jobs } = await extractCompanyJobs(page.text);
    if (!jobs.length) return { error: "이 페이지에서 직무 목록을 찾지 못했어요. 화면을 스크립트로 그리는 페이지는 읽히지 않을 수 있어요." };
    // the catalogue is searched by the name's first word, then matched exactly (same as lib/posting/segment.ts)
    const head = companyName.replace(/\(주\)|㈜|주식회사/g, " ").trim().split(/\s+/)[0] ?? "";
    const company = matchCompany(head.length >= 2 ? await (await catalog()).searchCompanies(head) : [], companyName);
    return { url: page.url, companyName, company: company ? { id: company.id, name: company.name } : null, jobs };
  } catch (e) {
    logAiFailure("company_jobs", e);
    return { error: "직무를 정리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
}

export async function saveCompanyJobsAction(input: unknown): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const p = CompanyJobsSave.safeParse(input);
  if (!p.success) return { error: "저장할 내용이 올바르지 않아요." };
  const { url, companyId, jobs } = p.data;
  const known = new Set(JOBS.map((j) => j.id));
  const now = new Date().toISOString();
  const rows = jobs
    .filter((j) => j.include)
    .map((j) => ({
      company_id: companyId,
      family: j.family,
      name: j.name,
      summary: j.summary,
      job_role_id: j.jobRoleId && known.has(j.jobRoleId) ? j.jobRoleId : null,
      source_url: url,
      imported_at: now,
    }));
  if (!rows.length) return { error: "넣기로 고른 직무가 없어요." };

  const db = createAdminClient();
  const up = await db.from("company_jobs").upsert(rows, { onConflict: "company_id,name" });
  if (up.error) {
    logAiFailure("save_company_jobs", up.error);
    return { error: "저장하지 못했어요." };
  }
  const roles = [...new Set(rows.flatMap((r) => (r.job_role_id ? [r.job_role_id] : [])))];
  const domain = domainOf(url);
  for (const role of roles) {
    const ev = await db.from("job_link_evidence").insert({ job_role_id: role, company_id: companyId, segment_id: null, source_domain: domain, source_url: url, method: "company_page" });
    if (ev.error && ev.error.code !== "23505") {
      logAiFailure("save_company_jobs_evidence", ev.error);
      return { error: "근거를 저장하지 못했어요." };
    }
  }
  if (roles.length) {
    const jl = await db.from("job_links").upsert(roles.map((r) => ({ job_role_id: r, company_id: companyId, basis: "posting" })), { onConflict: "job_role_id,company_id" });
    if (jl.error) {
      logAiFailure("save_company_jobs_links", jl.error);
      return { error: "직무 연결을 저장하지 못했어요." };
    }
  }
  revalidatePath("/admin/company-jobs");
  return { ok: `직무 ${rows.length}개를 저장하고, 우리 직무 ${roles.length}개를 회사와 이었어요.` };
}

export async function deleteCompanyPageAction(companyId: string, sourceUrl: string): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const db = createAdminClient();
  const del = await db.from("company_jobs").delete().eq("company_id", companyId).eq("source_url", sourceUrl).select("job_role_id");
  if (del.error) return { error: "지우지 못했어요." };
  await db.from("job_link_evidence").delete().eq("company_id", companyId).eq("source_url", sourceUrl).eq("method", "company_page");
  const roles = [...new Set((del.data ?? []).flatMap((r) => (r.job_role_id ? [String(r.job_role_id)] : [])))];
  for (const role of roles) {
    const { count } = await db.from("job_link_evidence").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("job_role_id", role);
    if (!count) await db.from("job_links").delete().eq("company_id", companyId).eq("job_role_id", role).eq("basis", "posting");
  }
  revalidatePath("/admin/company-jobs");
  return { ok: "가져온 직무를 지웠어요." };
}
