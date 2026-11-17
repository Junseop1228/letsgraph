// Supabase implementation of the read repositories (schema: supabase/migrations/20261113000000_init.sql).
// Rows are mapped to the domain contracts; JSON columns are re-validated with Zod.
import { GROWING_MIN_GROWTH, GROWING_MIN_REVENUE, LARGE_MIN_REVENUE, MID_MIN_REVENUE } from "@/lib/explore/company-type";
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
import { Activity, ConnectionOutput, Experience, JobPosting, PostingAnalysisOutput } from "@/lib/contracts/activity";
import { z } from "zod";
import { dartViewerUrl } from "@/lib/dart/updates";

type Row = Record<string, unknown>;
type JobLinkRow = { job_role_id: string; company_id: string; basis: "posting" | "estimated" };

/** reviewed catalogue companies (FR-OPS-01) */
const reviewed = () => pub().from("companies").select("*").eq("industry_reviewed", true);

function toCompany(r: Row): Company {
  return Company.parse({
    id: r.id,
    corpCode: r.corp_code ?? undefined,
    name: r.name,
    industryId: r.industry_id ?? "",
    revenue: r.revenue ?? null,
    operatingIncome: r.operating_income ?? null,
    fiscalYear: r.fiscal_year ?? null,
    revenueGrowth: r.revenue_growth ?? null,
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
    // seed rows keep the column default (true) but have no 사업보고서 접수번호
    aiGenerated: !!r.ai_generated && !!r.source_rcept_no,
  });
}

async function updatesFor(companyId: string, segmentId?: string) {
  const db = pub();
  let q = db.from("company_updates").select("*").eq("company_id", companyId).order("date", { ascending: false }).limit(10);
  if (segmentId) q = q.eq("segment_id", segmentId);
  const { data } = await q;
  return (data ?? []).map((u) =>
    CompanyUpdate.parse({ tag: u.tag, title: u.title, date: u.date, kind: u.kind, sourceLabel: u.source_label, ...(u.rcept_no ? { url: dartViewerUrl(u.rcept_no) } : {}) }),
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
  // The catalogue is the reviewed set only (FR-OPS-01): DART filers collected for review stay out of every list,
  // search and graph until their industry is assigned. A single company page still opens by id.
  async companiesByIds(ids) {
    if (!ids.length) return [];
    const out: Company[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await reviewed().in("id", ids.slice(i, i + 100));
      out.push(...(data ?? []).map(toCompany));
    }
    return out;
  },
  async companiesWithDetail() {
    const { data } = await reviewed().eq("has_detail", true).order("revenue", { ascending: false, nullsFirst: false }).limit(200);
    return (data ?? []).map(toCompany);
  },
  async topCompanies(industryId, n, type) {
    let q = reviewed().eq("industry_id", industryId);
    if (type === "large") q = q.gte("revenue", LARGE_MIN_REVENUE);
    if (type === "mid") q = q.gte("revenue", MID_MIN_REVENUE).lt("revenue", LARGE_MIN_REVENUE);
    if (type === "growing") q = q.gte("revenue", GROWING_MIN_REVENUE).gte("revenue_growth", GROWING_MIN_GROWTH);
    const { data } = await q.order("revenue", { ascending: false, nullsFirst: false }).limit(n);
    return (data ?? []).map(toCompany);
  },
  async industryCompanyCounts() {
    const { data: inds } = await pub().from("industries").select("id");
    const counts = await Promise.all(
      (inds ?? []).map(async (i) => {
        const { count } = await pub()
          .from("companies")
          .select("id", { count: "exact", head: true })
          .eq("industry_reviewed", true)
          .eq("industry_id", i.id);
        return [i.id as string, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(counts);
  },
  async companyCount() {
    const { count } = await pub().from("companies").select("id", { count: "exact", head: true }).eq("industry_reviewed", true);
    return count ?? 0;
  },
  async company(id) {
    const { data } = await pub().from("companies").select("*").eq("id", id).maybeSingle();
    return data ? toCompany(data) : null;
  },
  async searchCompanies(q) {
    if (!q.trim()) return [];
    const { data } = await reviewed()
      .ilike("name", `%${q.trim()}%`)
      .order("revenue", { ascending: false, nullsFirst: false })
      .limit(10);
    return (data ?? []).map(toCompany);
  },
  async storedJobLinks() {
    const out: JobLinkRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await pub().from("job_links").select("job_role_id,company_id,basis").range(from, from + 999);
      out.push(...((data ?? []) as JobLinkRow[]));
      if (!data || data.length < 1000) break;
    }
    // evidence behind 'posting' links (POST-07): job_link_evidence has RLS without policies, so it is read with the
    // server key; only counts and the latest check date leave the server, never source sites or URLs
    const ev = new Map<string, { count: number; lastSeen: string }>();
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { data } = await createAdminClient().from("job_link_evidence").select("job_role_id,company_id,checked_at").limit(5000);
      for (const r of data ?? []) {
        const k = `${r.job_role_id}|${r.company_id}`;
        const cur = ev.get(k);
        const at = String(r.checked_at).slice(0, 10);
        ev.set(k, { count: (cur?.count ?? 0) + 1, lastSeen: cur && cur.lastSeen > at ? cur.lastSeen : at });
      }
    } catch {
      /* no server key: links without evidence detail */
    }
    return out.map((l) => {
      const e = l.basis === "posting" ? ev.get(`${l.job_role_id}|${l.company_id}`) : undefined;
      return { jobRoleId: l.job_role_id, companyId: l.company_id, basis: l.basis, ...(e ? { evidence: e } : {}) };
    });
  },
  async segmentsFor(companyIds) {
    const out: Record<string, BusinessSegment[]> = Object.fromEntries(companyIds.map((id) => [id, []]));
    for (let i = 0; i < companyIds.length; i += 100) {
      const { data } = await pub()
        .from("business_segments")
        .select("*, segment_job_roles(job_role_id)")
        .in("company_id", companyIds.slice(i, i + 100));
      for (const s of data ?? [])
        out[String(s.company_id)]?.push(toSegment(s, ((s.segment_job_roles as Row[]) ?? []).map((j) => String(j.job_role_id))));
    }
    return out;
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
  async recentUpdates(limit, companyIds) {
    let q = pub()
      .from("company_updates")
      .select("company_id, tag, title, date, kind, source_label, rcept_no, companies(name)")
      .order("date", { ascending: false })
      .limit(limit);
    if (companyIds) q = q.in("company_id", companyIds.length ? companyIds : ["-"]);
    const { data } = await q;
    return (data ?? []).map((u) => ({
      companyId: String(u.company_id),
      companyName: String((u.companies as { name?: string } | null)?.name ?? u.company_id),
      update: CompanyUpdate.parse({ tag: u.tag, title: u.title, date: u.date, kind: u.kind, sourceLabel: u.source_label, ...(u.rcept_no ? { url: dartViewerUrl(u.rcept_no) } : {}) }),
    }));
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
        sourceUrl: p.source_url ?? undefined,
        questions: Array.isArray(p.questions) && p.questions.length ? p.questions : undefined,
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
        activityId: e.activity_id ?? undefined,
        theme: e.theme ?? undefined,
        chatLog: Array.isArray(e.chat_log) && e.chat_log.length ? e.chat_log : undefined,
        role: e.role || undefined,
        learning: e.learning || undefined,
      }),
    );
  },
  async activities() {
    const { data, error } = await (await createClient()).from("activities").select("*").order("created_at", { ascending: true });
    if (error) return []; // the table exists once 20261116000000_activities.sql is applied
    return (data ?? []).map((a) =>
      Activity.parse({
        id: a.id,
        title: a.title,
        kind: a.kind,
        period: a.period ?? undefined,
        role: a.role ?? undefined,
        dataset: a.dataset ?? undefined,
        summary: a.summary ?? "",
        scenes: Array.isArray(a.scenes) ? a.scenes : [],
        sourceLabel: a.source_label ?? undefined,
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
