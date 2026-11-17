// 회사 직무 다듬기 (specs/data-pipeline FR-OPS-04). Pure, unit-tested.
import type { z } from "zod";
import type { CompanyJobDraft, CompanyJobsAiOutput } from "@/lib/contracts/company-jobs";

const clean = (s: string | null | undefined, max: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/**
 * The AI's reading of a 직무 소개 page -> rows for the admin to confirm: names trimmed and unique, short summaries, a
 * job of our list only when it is a real id; rows with no matching job start unticked (they make no link).
 */
export function normalizeCompanyJobs(raw: z.infer<typeof CompanyJobsAiOutput>, jobIds: string[]): CompanyJobDraft[] {
  const seen = new Set<string>();
  const out: CompanyJobDraft[] = [];
  for (const j of raw.jobs) {
    const name = clean(j.name, 60);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const jobRoleId = j.jobRoleId && jobIds.includes(j.jobRoleId) ? j.jobRoleId : null;
    out.push({ family: clean(j.family, 40), name, summary: clean(j.summary, 200), jobRoleId, include: jobRoleId !== null });
  }
  return out.slice(0, 80);
}
