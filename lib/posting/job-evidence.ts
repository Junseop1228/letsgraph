// 공고 근거 쌓기 (specs/posting POST-07). After a posting is saved: if its job and company are known, confirm that the
// company really posted the job (a job-board URL as submitted, else one web search, never for a pair that is already
// confirmed), record the evidence, and mark the
// job ↔ company link (and job ↔ division, when the division is known) as confirmed by a posting.
// Runs after the response (next/server after), never blocks or fails the user's request; failures are only logged.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiEnabled, verifyPostingOnWeb } from "@/lib/ai/tasks";
import { logAiFailure } from "@/lib/ai/clamp";
import { decideEvidence, isJobBoard, domainOf, planEvidenceCheck } from "@/lib/posting/evidence-check";
import { JOBS } from "@/lib/reference/jobs";
import { creatorHash } from "@/lib/posting/creator";

export type EvidenceInput = {
  jobRoleId: string;
  companyId: string;
  segmentId: string | null;
  companyName: string;
  title: string;
  submittedUrl: string | null;
  /** the person whose posting it was; only a keyed hash of it is stored (SAFE-03) */
  creatorUid?: string;
};

type Db = ReturnType<typeof createAdminClient>;

/** Is this (job, company) already confirmed: evidence from a posting or a company page, or a link marked as confirmed? */
async function isConfirmed(db: Db, jobRoleId: string, companyId: string): Promise<boolean> {
  const [ev, link] = await Promise.all([
    db.from("job_link_evidence").select("id", { count: "exact", head: true }).eq("job_role_id", jobRoleId).eq("company_id", companyId),
    db.from("job_links").select("job_role_id", { count: "exact", head: true }).eq("job_role_id", jobRoleId).eq("company_id", companyId).eq("basis", "posting"),
  ]);
  return (ev.count ?? 0) > 0 || (link.count ?? 0) > 0;
}

async function linkSegment(db: Db, i: EvidenceInput) {
  if (!i.segmentId) return;
  const seg = await db.from("segment_job_roles").upsert({ segment_id: i.segmentId, job_role_id: i.jobRoleId }, { onConflict: "segment_id,job_role_id", ignoreDuplicates: true });
  if (seg.error) throw seg.error;
}

export async function recordJobEvidence(i: EvidenceInput): Promise<"recorded" | "known" | "not-found" | "skipped"> {
  const job = JOBS.find((j) => j.id === i.jobRoleId);
  if (!job) return "skipped";
  try {
    const db = createAdminClient();
    // look before the paid search: a job-board address is free evidence; an already confirmed pair needs no search
    const jobBoardUrl = !!i.submittedUrl && isJobBoard(domainOf(i.submittedUrl));
    const plan = planEvidenceCheck({ jobBoardUrl, confirmed: jobBoardUrl ? false : await isConfirmed(db, i.jobRoleId, i.companyId), aiOn: aiEnabled() });
    if (plan === "skip") return "skipped";
    if (plan === "known") {
      await linkSegment(db, i); // the division of this posting may be new even when the company is confirmed
      return "known";
    }
    let evidence = plan === "direct" ? decideEvidence(i.submittedUrl) : null;
    if (plan === "search") {
      const check = await verifyPostingOnWeb(i.companyName, i.title, job.name);
      evidence = check.found ? decideEvidence(i.submittedUrl, check.sources) : null;
    }
    if (!evidence) return "not-found";

    // once per job, company, division and site (unique index); a repeat is fine and skipped
    const ins = await db.from("job_link_evidence").insert({
      job_role_id: i.jobRoleId,
      company_id: i.companyId,
      segment_id: i.segmentId,
      source_domain: evidence.domain,
      source_url: evidence.url ?? null,
      method: evidence.method,
      creator_hash: i.creatorUid ? creatorHash(i.creatorUid, process.env.EVIDENCE_HASH_SECRET) : null,
    });
    if (ins.error && ins.error.code !== "23505") throw ins.error; // 23505 = already recorded
    const link = await db.from("job_links").upsert({ job_role_id: i.jobRoleId, company_id: i.companyId, basis: "posting" }, { onConflict: "job_role_id,company_id" });
    if (link.error) throw link.error;
    await linkSegment(db, i);
    return "recorded";
  } catch (e) {
    logAiFailure("job_evidence", e);
    return "skipped";
  }
}
