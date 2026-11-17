import { matchesType } from "@/lib/explore/company-type";
import type { CatalogRepo, UserRepo } from "@/lib/data/repo";
import {
  COMPANIES,
  COMPANY_DETAILS,
  DEMO_ANALYSES,
  DEMO_CONNECTIONS,
  DEMO_EXPERIENCES,
  DEMO_ACTIVITIES,
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
  company: async (id) => COMPANIES.find((c) => c.id === id) ?? null,
  companiesByIds: async (ids) => COMPANIES.filter((c) => ids.includes(c.id)),
  companiesWithDetail: async () => COMPANIES.filter((c) => c.hasDetail),
  topCompanies: async (industryId, n, type) =>
    COMPANIES.filter((c) => c.industryId === industryId && (!type || matchesType(c, type)))
      .sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1))
      .slice(0, n),
  industryCompanyCounts: async () => {
    const out: Record<string, number> = {};
    for (const c of COMPANIES) out[c.industryId] = (out[c.industryId] ?? 0) + 1;
    return out;
  },
  companyCount: async () => COMPANIES.length,
  searchCompanies: async (q) => {
    const n = norm(q);
    if (!n) return [];
    return COMPANIES.filter((c) => norm(c.name).includes(n)).slice(0, 10);
  },
  jobLinks: async (jobRoleId) => JOB_LINKS.filter((l) => l.jobRoleId === jobRoleId),
  storedJobLinks: async () => JOB_LINKS,
  segments: async (companyId) => SEGMENTS.filter((s) => s.companyId === companyId),
  segmentsFor: async (ids) => Object.fromEntries(ids.map((id) => [id, SEGMENTS.filter((s) => s.companyId === id)])),
  segment: async (id) => SEGMENTS.find((s) => s.id === id) ?? null,
  segmentDetail: async (id) => SEGMENT_DETAILS.find((d) => d.segmentId === id) ?? null,
  companyDetail: async (companyId) => COMPANY_DETAILS.find((d) => d.companyId === companyId) ?? null,
  recentUpdates: async (limit, companyIds) =>
    COMPANY_DETAILS.filter((d) => !companyIds || companyIds.includes(d.companyId)).flatMap((d) =>
      d.updates.map((update) => ({ companyId: d.companyId, companyName: COMPANIES.find((c) => c.id === d.companyId)?.name ?? d.companyId, update })),
    )
      .sort((a, b) => b.update.date.localeCompare(a.update.date))
      .slice(0, limit),
};

export const fixtureUser: UserRepo = {
  postings: async () => DEMO_POSTINGS,
  posting: async (id) => DEMO_POSTINGS.find((p) => p.id === id) ?? null,
  postingAnalysis: async (id) => DEMO_ANALYSES[id] ?? null,
  experiences: async () => DEMO_EXPERIENCES,
  activities: async () => DEMO_ACTIVITIES,
  connection: async (id) => DEMO_CONNECTIONS[id] ?? null,
  watchedCompanyIds: async () => DEMO_WATCHED,
};
