import type { CatalogRepo, UserRepo } from "@/lib/data/repo";
import {
  COMPANIES,
  COMPANY_DETAILS,
  DEMO_ANALYSES,
  DEMO_CONNECTIONS,
  DEMO_EXPERIENCES,
  DEMO_POSTINGS,
  DEMO_WATCHED,
  INDUSTRIES,
  JOB_FAMILIES,
  JOB_LINKS,
  JOB_ROLES,
  ONBOARDING_JOB_IDS,
  SEGMENTS,
  SEGMENT_DETAILS,
} from "@/lib/data/fixtures";

const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

export const fixtureCatalog: CatalogRepo = {
  source: "fixtures",
  industries: async () => INDUSTRIES,
  jobFamilies: async () => JOB_FAMILIES,
  jobRoles: async () => JOB_ROLES,
  jobRole: async (id) => JOB_ROLES.find((j) => j.id === id) ?? null,
  onboardingJobIds: async () => ONBOARDING_JOB_IDS,
  companies: async () => COMPANIES,
  company: async (id) => COMPANIES.find((c) => c.id === id) ?? null,
  searchCompanies: async (q) => {
    const n = norm(q);
    if (!n) return [];
    return COMPANIES.filter((c) => norm(c.name).includes(n)).slice(0, 10);
  },
  jobLinks: async (jobRoleId) => JOB_LINKS.filter((l) => l.jobRoleId === jobRoleId),
  segments: async (companyId) => SEGMENTS.filter((s) => s.companyId === companyId),
  segment: async (id) => SEGMENTS.find((s) => s.id === id) ?? null,
  segmentDetail: async (id) => SEGMENT_DETAILS.find((d) => d.segmentId === id) ?? null,
  companyDetail: async (companyId) => COMPANY_DETAILS.find((d) => d.companyId === companyId) ?? null,
};

export const fixtureUser: UserRepo = {
  postings: async () => DEMO_POSTINGS,
  posting: async (id) => DEMO_POSTINGS.find((p) => p.id === id) ?? null,
  postingAnalysis: async (id) => DEMO_ANALYSES[id] ?? null,
  experiences: async () => DEMO_EXPERIENCES,
  connection: async (id) => DEMO_CONNECTIONS[id] ?? null,
  watchedCompanyIds: async () => DEMO_WATCHED,
};
