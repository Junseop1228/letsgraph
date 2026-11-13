// Read-side data access used by server components. Two implementations:
//  - fixtures (no keys / demo): lib/data/fixture-repo.ts
//  - Supabase: lib/data/supabase-repo.ts
// Pages depend on this interface only, so switching sources never touches UI code.
import type {
  BusinessSegment,
  Company,
  CompanyDetail,
  Industry,
  JobFamily,
  JobLink,
  JobRole,
  SegmentDetail,
} from "@/lib/contracts/domain";
import type { ConnectionOutput, Experience, JobPosting, PostingAnalysisOutput } from "@/lib/contracts/activity";

export interface CatalogRepo {
  readonly source: "fixtures" | "supabase";
  industries(): Promise<Industry[]>;
  jobFamilies(): Promise<JobFamily[]>;
  jobRoles(): Promise<JobRole[]>;
  jobRole(id: string): Promise<JobRole | null>;
  onboardingJobIds(): Promise<string[]>;
  companies(): Promise<Company[]>;
  company(id: string): Promise<Company | null>;
  searchCompanies(q: string): Promise<Company[]>;
  jobLinks(jobRoleId: string): Promise<JobLink[]>;
  segments(companyId: string): Promise<BusinessSegment[]>;
  segment(id: string): Promise<BusinessSegment | null>;
  segmentDetail(id: string): Promise<SegmentDetail | null>;
  companyDetail(companyId: string): Promise<CompanyDetail | null>;
}

/** Per-user data. In fixture mode this returns the demo user's data. */
export interface UserRepo {
  postings(): Promise<JobPosting[]>;
  posting(id: string): Promise<JobPosting | null>;
  postingAnalysis(postingId: string): Promise<PostingAnalysisOutput | null>;
  experiences(): Promise<Experience[]>;
  connection(postingId: string): Promise<ConnectionOutput | null>;
  watchedCompanyIds(): Promise<string[]>;
}
