import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { JOBS } from "@/lib/reference/jobs";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { EvidenceDelete } from "@/components/admin/evidence-delete";
import { PageSkeleton } from "@/components/lg/page-skeleton";

export const metadata = { title: "관리자 · 공고 근거 · LetsGraph" };

type Row = {
  id: string;
  job_role_id: string;
  company_id: string;
  segment_id: string | null;
  source_domain: string;
  source_url: string | null;
  method: string;
  checked_at: string;
  creator_hash: string | null;
  companies: { name: string } | { name: string }[] | null;
};

const METHOD: Record<string, string> = { submitted_url: "채용 사이트 주소", web_search: "웹 검색", company_page: "회사 직무 소개" };
const jobName = new Map(JOBS.map((j) => [j.id, j.name]));

// 관리자: 공고 근거 (specs/safety SAFE-03). The newest evidence first; remove one row or everything one person added.
async function AdminEvidence() {
  await connection();
  await requireAdmin();
  const { data } = await createAdminClient()
    .from("job_link_evidence")
    .select("id, job_role_id, company_id, segment_id, source_domain, source_url, method, checked_at, creator_hash, companies(name)")
    .order("checked_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Row[];
  const byCreator = new Map<string, number>();
  for (const r of rows) if (r.creator_hash) byCreator.set(r.creator_hash, (byCreator.get(r.creator_hash) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-content-max space-y-8 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption text-text-secondary">관리자</p>
          <h1 className="mt-1 text-heading-1">공고 근거</h1>
          <p className="mt-1 text-body text-text-secondary">사용자가 올린 공고와 회사 직무 소개로 쌓인 직무 ↔ 회사 근거예요. 근거가 하나도 남지 않은 연결은 지울 때 같이 정리돼요.</p>
        </div>
        <AdminTabs current="/admin/evidence" />
      </div>

      {byCreator.size ? (
        <section className="space-y-2" aria-labelledby="creators-title">
          <h2 id="creators-title" className="text-heading-3">같은 사람이 만든 근거</h2>
          <p className="text-support text-text-secondary">누구인지는 알 수 없고, 같은 사람의 근거끼리만 묶여요.</p>
          <ul className="divide-y divide-border rounded-container border border-border">
            {[...byCreator.entries()].sort((a, b) => b[1] - a[1]).map(([hash, n]) => (
              <li key={hash} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
                <span className="figures text-label">흔적 {hash.slice(0, 8)} · 근거 {n}개</span>
                <EvidenceDelete creator={hash} count={n} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2" aria-labelledby="evidence-title">
        <h2 id="evidence-title" className="text-heading-3">최근 근거 {rows.length}개</h2>
        {rows.length ? (
          <ul className="divide-y divide-border rounded-container border border-border">
            {rows.map((r) => {
              const company = Array.isArray(r.companies) ? r.companies[0]?.name : r.companies?.name;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-label-strong">
                      {jobName.get(r.job_role_id) ?? r.job_role_id} ↔ {company ?? r.company_id}
                    </p>
                    <p className="text-caption text-text-secondary">
                      {METHOD[r.method] ?? r.method} ·{" "}
                      {r.source_url ? (
                        <a href={r.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {r.source_domain}
                        </a>
                      ) : (
                        r.source_domain
                      )}{" "}
                      · {r.checked_at.slice(0, 10)}
                      {r.creator_hash ? ` · 흔적 ${r.creator_hash.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <EvidenceDelete id={r.id} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body text-text-secondary">아직 쌓인 근거가 없어요.</p>
        )}
      </section>
    </div>
  );
}

export default function AdminEvidencePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminEvidence />
    </Suspense>
  );
}
