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
import type { Activity, ConnectionOutput, Experience, JobPosting, PostingAnalysisOutput } from "@/lib/contracts/activity";

export interface CatalogRepo {
  readonly source: "fixtures" | "supabase";
  industries(): Promise<Industry[]>;
  jobFamilies(): Promise<JobFamily[]>;
  jobRoles(): Promise<JobRole[]>;
  jobRole(id: string): Promise<JobRole | null>;
  onboardingJobIds(): Promise<string[]>;
  // The catalogue holds thousands of reviewed companies: never read it whole (PostgREST caps a read at 1,000 rows and the
  // client would get everything). Ask for the slice a screen needs.
  company(id: string): Promise<Company | null>;
  /** reviewed companies with these ids (watched, added to the graph) */
  companiesByIds(ids: string[]): Promise<Company[]>;
  /** reviewed companies that have a detail page (search defaults, the bell) */
  companiesWithDetail(): Promise<Company[]>;
  /** the n biggest reviewed companies of an industry, by revenue */
  topCompanies(industryId: string, n: number): Promise<Company[]>;
  /** reviewed companies per industry */
  industryCompanyCounts(): Promise<Record<string, number>>;
  /** reviewed companies in total */
  companyCount(): Promise<number>;
  searchCompanies(q: string): Promise<Company[]>;
  jobLinks(jobRoleId: string): Promise<JobLink[]>;
  /** every stored link (layer 2 'posting' links and hand-made seed links), for all jobs */
  storedJobLinks(): Promise<JobLink[]>;
  segments(companyId: string): Promise<BusinessSegment[]>;
  segmentsFor(companyIds: string[]): Promise<Record<string, BusinessSegment[]>>;
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
  /** 활동 (PORT-03), oldest first */
  activities(): Promise<Activity[]>;
  connection(postingId: string): Promise<ConnectionOutput | null>;
  watchedCompanyIds(): Promise<string[]>;
}
