// Supabase implementation of the read repositories (schema: supabase/migrations/20261113000000_init.sql).
// Rows are mapped to the domain contracts; JSON columns are re-validated with Zod.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

// catalogue reads need no session (public RLS policies); user reads use the cookie client
const pub = () => createPublicClient();
import type { CatalogRepo, UserRepo } from "@/lib/data/repo";
import {
  BusinessSegment,
  Company,
  CompanyDetail,
  FinancialPoint,
  FlowStep,
  Provenance,
  SegmentDetail,
  CompanyUpdate,
} from "@/lib/contracts/domain";
import { ConnectionOutput, Experience, JobPosting, PostingAnalysisOutput } from "@/lib/contracts/activity";
import { z } from "zod";

type Row = Record<string, unknown>;

function toCompany(r: Row): Company {
  return Company.parse({
    id: r.id,
    corpCode: r.corp_code ?? undefined,
    name: r.name,
    industryId: r.industry_id ?? "",
    revenue: r.revenue ?? null,
    operatingIncome: r.operating_income ?? null,
    fiscalYear: r.fiscal_year ?? null,
    basisNote: r.basis_note ?? undefined,
    source: r.source_kind ? { kind: r.source_kind, label: r.source_label ?? "", date: r.source_date ?? undefined } : undefined,
    hasDetail: !!r.has_detail,
  });
}

function toSegment(r: Row, jobRoleIds: string[]): BusinessSegment {
  return BusinessSegment.parse({
    id: r.id,
    companyId: r.company_id,
    name: r.name,
    shortName: r.short_name,
    revenue: r.revenue ?? null,
    operatingIncome: r.operating_income ?? null,
    calculated: !!r.calculated,
    summary: r.summary ?? "",
    jobRoleIds,
  });
}

async function updatesFor(companyId: string, segmentId?: string) {
  const db = pub();
  let q = db.from("company_updates").select("*").eq("company_id", companyId).order("date", { ascending: false }).limit(10);
  if (segmentId) q = q.eq("segment_id", segmentId);
  const { data } = await q;
  return (data ?? []).map((u) =>
    CompanyUpdate.parse({ tag: u.tag, title: u.title, date: u.date, kind: u.kind, sourceLabel: u.source_label }),
  );
}

export const supabaseCatalog: CatalogRepo = {
  source: "supabase",
  async industries() {
    const { data } = await pub().from("industries").select("id,name").order("id");
    return data ?? [];
  },
  async jobFamilies() {
    const { data } = await pub().from("job_families").select("id,name").order("id");
    return data ?? [];
  },
  async jobRoles() {
    const { data } = await pub().from("job_roles").select("id,name,family_id,description");
    return (data ?? []).map((r) => ({ id: r.id, name: r.name, groupId: r.family_id, description: r.description }));
  },
  async jobRole(id) {
    const { data } = await pub().from("job_roles").select("id,name,family_id,description").eq("id", id).maybeSingle();
    return data ? { id: data.id, name: data.name, groupId: data.family_id, description: data.description } : null;
  },
  async onboardingJobIds() {
    // Deck order is a product choice (fixtures ONBOARDING_JOB_IDS); keep the ids that exist in the DB.
    const { data } = await pub().from("job_roles").select("id");
    const ids = new Set((data ?? []).map((r) => r.id));
    const { ONBOARDING_JOB_IDS } = await import("@/lib/data/fixtures");
    return ONBOARDING_JOB_IDS.filter((id) => ids.has(id));
  },
  async companies() {
    const { data } = await pub().from("companies").select("*").order("revenue", { ascending: false, nullsFirst: false });
    return (data ?? []).map(toCompany);
  },
  async company(id) {
    const { data } = await pub().from("companies").select("*").eq("id", id).maybeSingle();
    return data ? toCompany(data) : null;
  },
  async searchCompanies(q) {
    if (!q.trim()) return [];
    const { data } = await pub().from("companies").select("*").ilike("name", `%${q.trim()}%`).limit(10);
    return (data ?? []).map(toCompany);
  },
  async jobLinks(jobRoleId) {
    const { data } = await pub().from("job_links").select("job_role_id,company_id,basis").eq("job_role_id", jobRoleId);
    return (data ?? []).map((l) => ({ jobRoleId: l.job_role_id, companyId: l.company_id, basis: l.basis }));
  },
  async segments(companyId) {
    const db = pub();
    const { data } = await db.from("business_segments").select("*, segment_job_roles(job_role_id)").eq("company_id", companyId);
    return (data ?? []).map((s) => toSegment(s, ((s.segment_job_roles as Row[]) ?? []).map((j) => String(j.job_role_id))));
  },
  async segment(id) {
    const db = pub();
    const { data } = await db.from("business_segments").select("*, segment_job_roles(job_role_id)").eq("id", id).maybeSingle();
    return data ? toSegment(data, ((data.segment_job_roles as Row[]) ?? []).map((j) => String(j.job_role_id))) : null;
  },
  async segmentDetail(id) {
    const db = pub();
    const { data } = await db.from("segment_details").select("*, business_segments(company_id)").eq("segment_id", id).maybeSingle();
    if (!data) return null;
    const companyId = String((data.business_segments as Row | null)?.company_id ?? "");
    return SegmentDetail.parse({
      segmentId: data.segment_id,
      flow: z.array(FlowStep).parse(data.flow),
      flowSource: Provenance.parse(data.flow_source),
      trend: z.array(FinancialPoint).parse(data.trend),
      trendSource: Provenance.parse(data.trend_source),
      jobNotes: data.job_notes ?? {},
      examplePostingId: data.example_posting_id ?? undefined,
      updates: companyId ? await updatesFor(companyId, id) : [],
      newsQuery: data.news_query ?? "",
    });
  },
  async companyDetail(companyId) {
    const { data } = await pub().from("company_details").select("*").eq("company_id", companyId).maybeSingle();
    if (!data) return null;
    return CompanyDetail.parse({
      companyId,
      trend: z.array(FinancialPoint).parse(data.trend),
      trendSource: Provenance.parse(data.trend_source),
      updates: await updatesFor(companyId),
      newsQuery: data.news_query ?? "",
    });
  },
};

export const supabaseUser: UserRepo = {
  async postings() {
    const { data } = await (await createClient()).from("job_postings").select("*").order("deadline", { ascending: true, nullsFirst: false });
    return (data ?? []).map((p) =>
      JobPosting.parse({
        id: p.id,
        companyId: p.company_id ?? undefined,
        companyName: p.company_name,
        segmentId: p.segment_id ?? undefined,
        title: p.title,
        jobRoleId: p.job_role_id ?? undefined,
        deadline: p.deadline,
        deadlineNote: p.deadline_note ?? undefined,
        status: p.status,
        source: p.source,
      }),
    );
  },
  async posting(id) {
    return (await this.postings()).find((p) => p.id === id) ?? null;
  },
  async postingAnalysis(postingId) {
    const { data } = await (await createClient()).from("posting_analyses").select("output").eq("posting_id", postingId).maybeSingle();
    return data ? PostingAnalysisOutput.parse(data.output) : null;
  },
  async experiences() {
    const { data } = await (await createClient()).from("experiences").select("*").order("created_at", { ascending: false });
    return (data ?? []).map((e) =>
      Experience.parse({
        id: e.id,
        title: e.title,
        kind: e.kind,
        period: e.period ?? undefined,
        situation: e.situation,
        action: e.action,
        result: e.result,
        competencies: e.competencies ?? [],
        sourceLabel: e.source_label ?? undefined,
      }),
    );
  },
  async connection(postingId) {
    const { data } = await (await createClient()).from("connections").select("output").eq("posting_id", postingId).maybeSingle();
    return data ? ConnectionOutput.parse(data.output) : null;
  },
  async watchedCompanyIds() {
    const { data } = await (await createClient()).from("watched_companies").select("company_id");
    return (data ?? []).map((w) => w.company_id);
  },
};
