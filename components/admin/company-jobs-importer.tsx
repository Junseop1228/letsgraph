"use client";
// 회사 직무 가져오기 화면 (specs/data-pipeline FR-OPS-04): URL -> read -> check (company, our job per row, include) -> save.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readCompanyJobsAction, saveCompanyJobsAction, type ReadResult } from "@/app/(main)/admin/company-jobs/actions";
import type { CompanyJobDraft } from "@/lib/contracts/company-jobs";
import { btn, TrustLabel } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
type Props = { jobs: Option[] };
const field = "h-control-md rounded-element border border-border-emphasized bg-bg-surface px-3 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CompanyJobsImporter({ jobs: jobOptions }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [read, setRead] = useState<ReadResult | null>(null);
  const [rows, setRows] = useState<CompanyJobDraft[]>([]);
  const [company, setCompany] = useState<Option | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Option[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function readPage() {
    setNote(null);
    start(async () => {
      const r = await readCompanyJobsAction(url);
      if (r.error) return setNote(r.error);
      setRead(r);
      setRows(r.jobs ?? []);
      setCompany(r.company ?? null);
      setQuery(r.company ? "" : r.companyName ?? "");
    });
  }
  async function searchCompany() {
    const q = query.trim();
    if (!q) return;
    const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(q)}`);
    setFound(res.ok ? ((await res.json()) as Option[]).map((c) => ({ id: c.id, name: c.name })) : []);
  }
  function save() {
    if (!read?.url || !company) return;
    start(async () => {
      const r = await saveCompanyJobsAction({ url: read.url, companyId: company.id, jobs: rows });
      setNote(r.ok ?? r.error ?? null);
      if (r.ok) {
        setRead(null);
        setRows([]);
        setUrl("");
        router.refresh();
      }
    });
  }
  const patch = (i: number, p: Partial<CompanyJobDraft>) => setRows((list) => list.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const chosen = rows.filter((r) => r.include).length;

  return (
    <section className="space-y-5" aria-labelledby="import-title">
      <div className="space-y-2">
        <h2 id="import-title" className="text-heading-3">직무 소개 페이지 가져오기</h2>
        <p className="text-body text-text-secondary">회사 채용 사이트의 직무 소개 주소를 넣으면, 직무를 읽어 우리 직무와 맞춰 보여 줘요. 확인하고 저장하면 회사와 직무가 이어져요.</p>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); readPage(); }}>
          <label htmlFor="page-url" className="sr-only">직무 소개 페이지 주소</label>
          <input id="page-url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.example.com/career/job/introduce" className={cn(field, "min-w-0 flex-1")} />
          <button type="submit" disabled={pending || !url.trim()} className={btn.primary}>{pending && !read ? "읽는 중…" : "읽기"}</button>
        </form>
      </div>

      {read?.url ? (
        <div className="space-y-4 rounded-container bg-bg-sunken p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-label">
              페이지의 회사: <span className="font-semibold">{read.companyName || "알 수 없음"}</span>
              {company ? <> → 연결할 회사: <span className="font-semibold">{company.name}</span></> : <span className="text-text-secondary"> → DB에서 회사를 골라 주세요</span>}
            </p>
            <TrustLabel p={{ kind: "ai", text: "AI가 읽음" }} />
          </div>
          {!company || found.length ? (
            <div className="flex flex-wrap gap-2">
              <label htmlFor="company-q" className="sr-only">회사 검색</label>
              <input id="company-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="회사 이름" className={cn(field, "w-56")} />
              <button type="button" onClick={searchCompany} className={cn(btn.secondary, btn.sm)}>찾기</button>
              {found.map((c) => (
                <button key={c.id} type="button" onClick={() => { setCompany(c); setFound([]); }} className={cn(btn.outline, btn.sm)}>{c.name}</button>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setFound([{ id: company.id, name: company.name }])} className={cn(btn.ghost, btn.sm)}>다른 회사로 바꾸기</button>
          )}

          <div className="overflow-x-auto rounded-container border border-border bg-bg-surface">
            <table className="w-full min-w-180 text-left text-label">
              <caption className="sr-only">읽은 직무 목록</caption>
              <thead className="border-b border-border text-text-secondary">
                <tr>
                  <th scope="col" className="w-14 px-3 py-2">넣기</th>
                  <th scope="col" className="px-3 py-2">직무군</th>
                  <th scope="col" className="px-3 py-2">회사 직무명</th>
                  <th scope="col" className="px-3 py-2">우리 직무</th>
                  <th scope="col" className="px-3 py-2">요약</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={r.name} className={cn(!r.include && "text-text-secondary")}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={r.include} onChange={(e) => patch(i, { include: e.target.checked })} aria-label={`${r.name} 넣기`} className="size-4" />
                    </td>
                    <td className="px-3 py-2">{r.family}</td>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2">
                      <select value={r.jobRoleId ?? ""} onChange={(e) => patch(i, { jobRoleId: e.target.value || null })} aria-label={`${r.name}에 맞는 우리 직무`} className="h-control-sm rounded-element border border-border-emphasized bg-bg-surface px-2 text-label">
                        <option value="">맞는 직무 없음</option>
                        {jobOptions.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-support text-text-secondary">{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={pending || !company || !chosen} className={btn.primary}>{pending ? "저장하는 중…" : `직무 ${chosen}개 저장`}</button>
            <button type="button" onClick={() => { setRead(null); setRows([]); }} className={btn.ghost}>취소</button>
            <p className="text-caption text-text-secondary">우리 직무가 정해진 줄만 회사와 이어져요. 요약은 AI가 쓴 글이라 회사 문장이 아니에요.</p>
          </div>
        </div>
      ) : null}

      {note ? <p role="status" className="text-label text-text-secondary">{note}</p> : null}
    </section>
  );
}
