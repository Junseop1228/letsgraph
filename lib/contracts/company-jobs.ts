// 회사 직무 소개 (specs/data-pipeline FR-OPS-04): what the AI reads from a company's "직무 소개" page, and what the admin
// confirms before saving. Summaries are short and in the AI's own words (the company's text is never stored).
import { z } from "zod";

export const CompanyJobDraft = z.object({
  family: z.string().max(40),
  name: z.string().min(1).max(60),
  summary: z.string().max(300),
  jobRoleId: z.string().max(60).nullable(),
  include: z.boolean(),
});
export type CompanyJobDraft = z.infer<typeof CompanyJobDraft>;

export const CompanyJobsAiOutput = z.object({
  companyName: z.string(),
  jobs: z.array(z.object({ family: z.string(), name: z.string(), summary: z.string(), jobRoleId: z.string().nullable() })),
});

export const CompanyJobsSave = z.object({
  url: z.string().url().max(2048),
  companyId: z.string().min(1).max(80),
  jobs: z.array(CompanyJobDraft).min(1).max(80),
});
