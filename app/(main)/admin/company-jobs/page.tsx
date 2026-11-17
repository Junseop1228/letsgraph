import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { JOBS } from "@/lib/reference/jobs";
import { CompanyJobsImporter } from "@/components/admin/company-jobs-importer";
import { DeleteImport } from "@/components/admin/delete-import";
import { PageSkeleton } from "@/components/lg/page-skeleton";

export const metadata = { title: "관리자 · 회사 직무 · LetsGraph" };

type Row = { company_id: string; source_url: string; imported_at: string; job_role_id: string | null; companies: { name: string } | { name: string }[] | null };

// 관리자: 회사 직무 소개 가져오기 (specs/data-pipeline FR-OPS-04). Everyone but admins gets "not found".
async function AdminCompanyJobs() {
  await connection();
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("company_jobs")
    .select("company_id, source_url, imported_at, job_role_id, companies(name)")
    .order("imported_at", { ascending: false })
    .limit(2000);

  // one line per imported page
  const pages = new Map<string, { companyId: string; company: string; url: string; at: string; jobs: number; linked: number }>();
  for (const r of (data ?? []) as Row[]) {
    const key = `${r.company_id}|${r.source_url}`;
    const name = Array.isArray(r.companies) ? r.companies[0]?.name : r.companies?.name;
    const p = pages.get(key) ?? { companyId: r.company_id, company: name ?? r.company_id, url: r.source_url, at: r.imported_at, jobs: 0, linked: 0 };
    p.jobs += 1;
    if (r.job_role_id) p.linked += 1;
    if (r.imported_at > p.at) p.at = r.imported_at;
    pages.set(key, p);
  }

  return (
    <div className="mx-auto max-w-content-max space-y-10 px-5 py-8">
      <div>
        <p className="text-caption text-text-secondary">관리자</p>
        <h1 className="mt-1 text-heading-1">회사 직무</h1>
      </div>
      <CompanyJobsImporter jobs={JOBS.map((j) => ({ id: j.id, name: j.name }))} />
      <section className="space-y-3" aria-labelledby="imported-title">
        <h2 id="imported-title" className="text-heading-3">가져온 페이지</h2>
        {pages.size ? (
          <ul className="divide-y divide-border rounded-container border border-border">
            {[...pages.values()].map((p) => (
              <li key={p.companyId + p.url} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-label-strong">{p.company}</p>
                  <a href={p.url} target="_blank" rel="noreferrer" className="block truncate text-support text-text-secondary underline underline-offset-2">{p.url}</a>
                  <p className="text-caption text-text-secondary">
                    직무 <span className="figures">{p.jobs}</span>개, 우리 직무와 연결 <span className="figures">{p.linked}</span>개, {p.at.slice(0, 10)}
                  </p>
                </div>
                <DeleteImport companyId={p.companyId} sourceUrl={p.url} label={p.company} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-secondary">아직 가져온 페이지가 없어요.</p>
        )}
      </section>
    </div>
  );
}

export default function AdminCompanyJobsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminCompanyJobs />
    </Suspense>
  );
}
