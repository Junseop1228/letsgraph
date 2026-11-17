// 공고 근거 쌓기 (specs/posting POST-07). After a posting is saved: if its job and company are known, confirm that the
// company really posted the job (a job-board URL as submitted, else one web search), record the evidence, and mark the
// job ↔ company link (and job ↔ division, when the division is known) as confirmed by a posting.
// Runs after the response (next/server after), never blocks or fails the user's request; failures are only logged.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiEnabled, verifyPostingOnWeb } from "@/lib/ai/tasks";
import { logAiFailure } from "@/lib/ai/clamp";
import { decideEvidence, isJobBoard, domainOf } from "@/lib/posting/evidence-check";
import { JOBS } from "@/lib/reference/jobs";

export type EvidenceInput = {
  jobRoleId: string;
  companyId: string;
  segmentId: string | null;
  companyName: string;
  title: string;
  submittedUrl: string | null;
};

export async function recordJobEvidence(i: EvidenceInput): Promise<"recorded" | "not-found" | "skipped"> {
  const job = JOBS.find((j) => j.id === i.jobRoleId);
  if (!job) return "skipped";
  try {
    // a job-board URL is evidence by itself; otherwise ask the web once
    const direct = i.submittedUrl && isJobBoard(domainOf(i.submittedUrl)) ? decideEvidence(i.submittedUrl) : null;
    let evidence = direct;
    if (!evidence) {
      if (!aiEnabled()) return "skipped";
      const check = await verifyPostingOnWeb(i.companyName, i.title, job.name);
      evidence = check.found ? decideEvidence(i.submittedUrl, check.sources) : null;
    }
    if (!evidence) return "not-found";

    const db = createAdminClient();
    // once per job, company, division and site (unique index); a repeat is fine and skipped
    const ins = await db.from("job_link_evidence").insert({
      job_role_id: i.jobRoleId,
      company_id: i.companyId,
      segment_id: i.segmentId,
      source_domain: evidence.domain,
      source_url: evidence.url ?? null,
      method: evidence.method,
    });
    if (ins.error && ins.error.code !== "23505") throw ins.error; // 23505 = already recorded
    const link = await db.from("job_links").upsert({ job_role_id: i.jobRoleId, company_id: i.companyId, basis: "posting" }, { onConflict: "job_role_id,company_id" });
    if (link.error) throw link.error;
    if (i.segmentId) {
      const seg = await db.from("segment_job_roles").upsert({ segment_id: i.segmentId, job_role_id: i.jobRoleId }, { onConflict: "segment_id,job_role_id", ignoreDuplicates: true });
      if (seg.error) throw seg.error;
    }
    return "recorded";
  } catch (e) {
    logAiFailure("job_evidence", e);
    return "skipped";
  }
}
