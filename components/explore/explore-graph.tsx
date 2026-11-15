"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/use-memo -- this v1.3 port is replaced by the graph-engine switch (decisions 2026-11-14) */
// 탐색 > 나의 취업 그래프 (specs/explore FR-MAP-03). Stars = my liked jobs (max 5, toggled in the header).
// Panels follow prototype v1.3: job panel (industries), industry panel (companies), company card.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Heart, List, Network } from "lucide-react";
import { toast } from "sonner";
import type { BusinessSegment, Company, Industry, JobLink, JobRole } from "@/lib/contracts/domain";
import { buildGraph, type GNode } from "@/lib/explore/graph";
import { formatEokShort } from "@/lib/format";
import { readLikedJobs, useWatched } from "@/lib/client/local-state";
import { JobGraph } from "@/components/explore/job-graph";
import { FlowGraph } from "@/components/explore/flow-graph";
import { stressGraph } from "@/lib/explore/stress";
import { track } from "@/lib/client/analytics";
import { Kicker, SourceLine, TrustLabel, btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = {
  roles: JobRole[];
  industries: Industry[];
  companies: Company[];
  links: JobLink[]; // all jobs
  segmentsByCompany: Record<string, BusinessSegment[]>;
  watchedInitial: string[];
  initialJob: string;
};

type Sel = { kind: "job"; job: string } | { kind: "ind"; job: string; ind: string } | { kind: "co"; job: string; co: string } | null;

export function ExploreGraph(p: Props) {
  const watched = useWatched(p.watchedInitial);
  const roleById = useMemo(() => new Map(p.roles.map((r) => [r.id, r])), [p.roles]);
  const coById = useMemo(() => new Map(p.companies.map((c) => [c.id, c])), [p.companies]);
  const companyIndustry = useMemo(() => Object.fromEntries(p.companies.map((c) => [c.id, c.industryId])), [p.companies]);
  const linkedJobs = useMemo(() => new Set(p.links.map((l) => l.jobRoleId)), [p.links]);

  const [myJobs, setMyJobs] = useState<string[]>([p.initialJob]);
  const [on, setOn] = useState<string[]>([p.initialJob]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [vertical, setVertical] = useState(false);
  const [engine, setEngine] = useState<"flow" | "d3">("flow"); // engine spike: ?engine=d3 shows the old d3/SVG graph
  const [stress, setStress] = useState(0); // engine spike: ?stress=150 draws a synthetic worst-case graph

  useEffect(() => {
    const liked = readLikedJobs().filter((j) => roleById.has(j) && linkedJobs.has(j));
    const list = [p.initialJob, ...liked.filter((j) => j !== p.initialJob)].slice(0, 5);
    setMyJobs(list);
    setOn(list);
    const q = new URLSearchParams(window.location.search);
    setEngine(q.get("engine") === "d3" ? "d3" : "flow");
    setStress(Math.min(Number(q.get("stress")) || 0, 400));
    const mq = window.matchMedia("(max-width: 767px)");
    const upd = () => setVertical(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, [p.initialJob, roleById, linkedJobs]);

  const stars = on.map((j) => roleById.get(j)).filter((r): r is JobRole => !!r);
  const data = useMemo(
    () => (stress ? stressGraph(stress, vertical) : buildGraph({ jobs: stars, industries: p.industries, companies: p.companies, links: p.links, saved: watched.ids, expanded, vertical })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on.join(","), watched.ids.join(","), expanded, vertical, p.links, stress],
  );

  const indName = (id: string) => p.industries.find((i) => i.id === id)?.name ?? id;
  const linksOf = (job: string) => p.links.filter((l) => l.jobRoleId === job);
  const label = (n: GNode) =>
    n.type === "center"
      ? `내 직무 ${n.label}`
      : n.type === "ind"
        ? `${n.label}, ${roleById.get(n.job)?.name} 연결 기업 ${n.count}곳${(n.shared ?? 0) > 1 ? `, 내 직무 ${n.shared}개가 함께 뽑는 산업` : ""}`
        : `${n.label}, ${n.basis === "posting" ? "실제 공고 근거" : "추정 연결"}`;

  function onSelect(n: GNode) {
    if (n.type === "center") setSel({ kind: "job", job: n.job });
    else if (n.type === "ind") {
      const key = `${n.job}|${n.ref}`;
      track("graph_industry_open", { industry: n.ref });
      setExpanded((cur) => (cur === key ? null : key));
      setSel({ kind: "ind", job: n.job, ind: n.ref });
    } else setSel({ kind: "co", job: n.job, co: n.ref });
  }
  const selectedId = !sel ? null : sel.kind === "job" ? `job:${sel.job}` : sel.kind === "ind" ? `ind:${sel.job}:${sel.ind}` : `co:${sel.job}:${sel.co}`;

  function toggleJob(j: string) {
    setOn((cur) => (cur.includes(j) ? (cur.length > 1 ? cur.filter((x) => x !== j) : cur) : [...cur, j].slice(0, 5)));
    setSel(null);
    setExpanded(null);
  }
  function toggleWatch(id: string) {
    const was = watched.has(id);
    watched.toggle(id);
    toast(was ? "관심 기업에서 뺐어요" : "관심 기업에 저장했어요");
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-header-height))] flex-col">
      {/* 내 직무 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-sunken px-5 py-2">
        <span className="text-label text-text-secondary">내 직무</span>
        {myJobs.map((j) => (
          <button key={j} type="button" aria-pressed={on.includes(j)} onClick={() => toggleJob(j)} className={cn("h-8 rounded-element px-3 text-label", on.includes(j) ? "bg-bg-selected font-semibold" : "text-text-secondary hover:bg-overlay-hover")}>
            {roleById.get(j)?.name}
          </button>
        ))}
        <Link href="/explore" className="h-8 rounded-element px-3 text-label leading-8 text-text-secondary hover:bg-overlay-hover">+ 직무 고르기</Link>
        <div className="flex-1" />
        <div role="group" aria-label="보기 방식" className="flex gap-0.5 rounded-[7px] bg-bg-tonal p-[3px]">
          <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")} className={cn("flex h-8 items-center gap-1.5 rounded-element px-3 text-label", view === "graph" ? "bg-bg-selected font-semibold" : "text-text-secondary")}>
            <Network className="size-4" aria-hidden /> 그래프
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={cn("flex h-8 items-center gap-1.5 rounded-element px-3 text-label", view === "list" ? "bg-bg-selected font-semibold" : "text-text-secondary")}>
            <List className="size-4" aria-hidden /> 목록
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative min-h-[520px] border-r border-border">
          {view === "graph" ? (
            <>
              {engine === "d3" ? (
                <JobGraph data={data} selectedId={selectedId} onSelect={onSelect} onBackground={() => { setSel(null); }} companyIndustry={companyIndustry} label={label} />
              ) : (
                <FlowGraph data={data} selectedId={selectedId} onSelect={onSelect} onBackground={() => { setSel(null); }} companyIndustry={companyIndustry} label={label} />
              )}
              <div className="pointer-events-none absolute left-4 top-4 space-y-2 rounded-element bg-bg-surface/90 p-3 shadow-[0_0_0_1px_var(--color-border)]">
                <p className="text-label-strong">나의 취업 그래프</p>
                <ul className="space-y-1 text-caption text-text-secondary">
                  <li className="flex items-center gap-2"><i className="size-3 rounded-full bg-graph-job" />내 직무</li>
                  <li className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-graph-node" />산업 · 클수록 연결 기업이 많아요 · 눌러서 펼치기</li>
                  <li className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-graph-node ring-1 ring-border-strong ring-offset-1 ring-offset-bg-surface" />내 직무 여러 개가 함께 뽑는 산업</li>
                  <li className="flex items-center gap-2"><span className="flex w-4 items-center gap-0.5"><i className="size-1.5 rounded-full border border-graph-node" /><i className="size-2.5 rounded-full border border-graph-node" /></span>기업 · 클수록 매출이 커요 · 검정 = 관심 기업</li>
                  <li className="flex items-center gap-2"><i className="h-0.5 w-4 bg-graph-division" />선이 굵을수록 실제 공고가 많아요 · 점선 = 추정</li>
                </ul>
              </div>
            </>
          ) : (
            <ListView stars={stars} links={p.links} coById={coById} indName={indName} saved={watched.ids} onPick={(job, co) => setSel({ kind: "co", job, co })} />
          )}
        </section>

        <aside className="space-y-5 px-6 py-5" aria-live="polite">
          {!sel || sel.kind === "job" ? (
            <JobPanel job={roleById.get(sel?.job ?? stars[0]?.id ?? p.initialJob)!} links={linksOf(sel?.job ?? stars[0]?.id ?? p.initialJob)} coById={coById} indName={indName} onOpen={(job, ind) => { setExpanded(`${job}|${ind}`); setSel({ kind: "ind", job, ind }); }} />
          ) : sel.kind === "ind" ? (
            <IndustryPanel job={roleById.get(sel.job)!} ind={sel.ind} indName={indName} links={linksOf(sel.job).filter((l) => coById.get(l.companyId)?.industryId === sel.ind)} coById={coById} otherJobs={myJobs.filter((j) => j !== sel.job && linksOf(j).some((l) => coById.get(l.companyId)?.industryId === sel.ind)).map((j) => roleById.get(j)!.name)} saved={watched.ids} onPick={(co) => setSel({ kind: "co", job: sel.job, co })} />
          ) : (
            <CompanyCard c={coById.get(sel.co)!} job={roleById.get(sel.job)!} basis={linksOf(sel.job).find((l) => l.companyId === sel.co)?.basis ?? "estimated"} segs={p.segmentsByCompany[sel.co] ?? []} saved={watched.has(sel.co)} onToggle={() => toggleWatch(sel.co)} />
          )}
        </aside>
      </div>
    </div>
  );
}

function JobPanel({ job, links, coById, indName, onOpen }: { job: JobRole; links: JobLink[]; coById: Map<string, Company>; indName: (id: string) => string; onOpen: (job: string, ind: string) => void }) {
  const byInd = new Map<string, JobLink[]>();
  for (const l of links) {
    const c = coById.get(l.companyId);
    if (c) byInd.set(c.industryId, [...(byInd.get(c.industryId) ?? []), l]);
  }
  const posting = links.filter((l) => l.basis === "posting").length;
  return (
    <>
      <Kicker>내 직무</Kicker>
      <div>
        <h1 className="text-heading-1">{job.name}</h1>
        <p className="mt-1 text-body text-text-secondary">{job.description}</p>
        <p className="mt-2 text-support">연결 기업 <span className="figures">{links.length}</span>곳 · 실제 공고 근거 <span className="figures">{posting}</span>곳</p>
      </div>
      <ul>
        {[...byInd.entries()].map(([ind, ls]) => (
          <li key={ind}>
            <button type="button" onClick={() => onOpen(job.id, ind)} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-border px-1 py-3 text-left hover:bg-overlay-hover">
              <span className="text-label-strong">{indName(ind)}</span>
              <span className="figures text-caption text-text-secondary">{ls.length}곳 · 공고 {ls.filter((l) => l.basis === "posting").length}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-secondary">산업을 누르면 그래프에 기업이 펼쳐져요. 기업을 끌어서 옮길 수 있어요.</p>
    </>
  );
}

function IndustryPanel({ job, ind, indName, links, coById, otherJobs, saved, onPick }: { job: JobRole; ind: string; indName: (id: string) => string; links: JobLink[]; coById: Map<string, Company>; otherJobs: string[]; saved: string[]; onPick: (co: string) => void }) {
  const rows = [...links].sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1));
  return (
    <>
      <Kicker>{job.name} · 산업</Kicker>
      <h1 className="text-heading-1">{indName(ind)}</h1>
      {otherJobs.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
          이 산업은 내 다른 직무도 뽑아요:
          {otherJobs.map((n) => <span key={n} className="h-6 rounded-inner bg-bg-tonal px-2 leading-6 text-text-primary">{n}</span>)}
        </p>
      )}
      <ul>
        {rows.map((l) => {
          const c = coById.get(l.companyId)!;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-border px-1 py-3 text-left hover:bg-overlay-hover">
                <span>
                  <span className="flex items-center gap-2 text-label-strong">{saved.includes(c.id) && <i aria-hidden className="size-2 rounded-full bg-graph-saved" />}{c.name}</span>
                  <span className="text-caption text-text-secondary">{l.basis === "posting" ? "실제 공고 근거" : "추정"}</span>
                </span>
                <span className="figures text-data">{formatEokShort(c.revenue)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function CompanyCard({ c, job, basis, segs, saved, onToggle }: { c: Company; job: JobRole; basis: "posting" | "estimated"; segs: BusinessSegment[]; saved: boolean; onToggle: () => void }) {
  const withJob = segs.filter((s) => s.jobRoleIds.includes(job.id));
  return (
    <>
      <Kicker>기업</Kicker>
      <div>
        <h1 className="text-heading-1">{c.name}</h1>
        {c.basisNote && <p className="text-support">{c.basisNote} 기준</p>}
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-element border border-border">
        <div className="border-r border-border p-3"><p className="text-caption text-text-secondary">{c.fiscalYear ?? "최근"} 매출</p><p className="figures text-figure">{formatEokShort(c.revenue)}</p></div>
        <div className="p-3"><p className="text-caption text-text-secondary">영업이익</p><p className="figures text-figure">{formatEokShort(c.operatingIncome)}</p></div>
      </div>
      {c.source ? <SourceLine p={c.source} /> : <p className="text-caption text-text-secondary">수치 연결 전이에요.</p>}
      <p className="flex items-center gap-2 text-label">{job.name} 연결 <TrustLabel p={{ kind: basis === "posting" ? "filing" : "estimate", text: basis === "posting" ? "실제 공고 근거" : "추정" }} /></p>
      {withJob.length > 0 && (
        <ul>
          {withJob.map((s) => (
            <li key={s.id} className="border-b border-border">
              <Link href={`/company/${c.id}/segment/${s.id}?job=${job.id}`} className="flex items-center justify-between gap-2 px-1 py-3 hover:bg-overlay-hover">
                <span className="text-label-strong">{s.name}</span>
                <span className="figures text-data">{formatEokShort(s.revenue)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {c.hasDetail && <Link href={`/company/${c.id}`} className={btn.primary}>기업 상세 보기 <ArrowRight className="size-4" aria-hidden /></Link>}
        <button type="button" onClick={onToggle} aria-pressed={saved} className={btn.secondary}><Heart className={cn("size-4", saved && "fill-current")} aria-hidden /> {saved ? "관심 저장됨" : "관심 저장"}</button>
      </div>
    </>
  );
}

function ListView({ stars, links, coById, indName, saved, onPick }: { stars: JobRole[]; links: JobLink[]; coById: Map<string, Company>; indName: (id: string) => string; saved: string[]; onPick: (job: string, co: string) => void }) {
  return (
    <div className="space-y-6 p-6">
      {stars.map((j) => {
        const ls = links.filter((l) => l.jobRoleId === j.id).sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1));
        return (
          <section key={j.id}>
            <Kicker>{j.name}</Kicker>
            <ul className="mt-2">
              {ls.map((l) => {
                const c = coById.get(l.companyId)!;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => onPick(j.id, c.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-border px-1 py-2.5 text-left hover:bg-overlay-hover">
                      <span className="text-label-strong">{saved.includes(c.id) ? "● " : ""}{c.name} <span className="font-normal text-text-secondary">· {indName(c.industryId)} · {l.basis === "posting" ? "실제 공고" : "추정"}</span></span>
                      <span className="figures text-data">{formatEokShort(c.revenue)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
