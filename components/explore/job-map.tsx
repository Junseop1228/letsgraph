"use client";
// 직무 맵 (specs/explore FR-MAP-03). Server passes data; this component owns selection and filters only.
import Link from "next/link";
import { useMemo, useState } from "react";
import { HelpCircle, Heart, ArrowRight, Search } from "lucide-react";
import type { BusinessSegment, Company, Industry, JobFamily, JobLink, JobRole } from "@/lib/contracts/domain";
import { MAP, branchPositions, layoutCompanies, type NodePos } from "@/lib/explore/layout";
import { formatEokShort } from "@/lib/format";
import { useWatched } from "@/lib/client/local-state";
import { Kicker, SourceLine, TrustLabel, btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = {
  job: JobRole;
  families: JobFamily[];
  roles: JobRole[];
  linkCounts: Record<string, number>;
  industries: Industry[];
  companies: Company[];
  links: JobLink[];
  segmentsByCompany: Record<string, BusinessSegment[]>;
  watchedInitial: string[];
};

type SizeFilter = "all" | "big" | "mid" | "none";
const SIZE_LABEL: Record<SizeFilter, string> = { all: "전체", big: "10조 이상", mid: "1~10조", none: "수치 연결 전" };
const sizeBand = (c: Company): SizeFilter => (c.revenue == null ? "none" : c.revenue >= 100000 ? "big" : "mid");

export function JobMap(p: Props) {
  const watched = useWatched(p.watchedInitial);
  const [sel, setSel] = useState<string | null>(null);
  const [size, setSize] = useState<SizeFilter>("all");
  const [ind, setInd] = useState<string>("all");
  const [tip, setTip] = useState(false);
  const [q, setQ] = useState("");

  const byId = useMemo(() => new Map(p.companies.map((c) => [c.id, c])), [p.companies]);
  const linkOf = useMemo(() => new Map(p.links.map((l) => [l.companyId, l])), [p.links]);
  const visibleLinks = p.links.filter((l) => {
    const c = byId.get(l.companyId);
    return !!c && (size === "all" || sizeBand(c) === size) && (ind === "all" || c.industryId === ind);
  });
  const { nodes, wedges } = useMemo(
    () => layoutCompanies(p.companies, visibleLinks, p.industries.map((i) => i.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.companies, p.industries, size, ind, p.links],
  );
  const selNode = nodes.find((n) => n.id === sel) ?? null;
  const selCo = sel ? byId.get(sel) ?? null : null;
  const segs = sel ? p.segmentsByCompany[sel] ?? [] : [];
  const branches = selNode ? branchPositions(selNode, segs.length) : [];
  const postingCount = p.links.filter((l) => l.basis === "posting").length;
  const ranked = [...p.links].map((l) => byId.get(l.companyId)!).filter(Boolean).sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1));
  const indName = (id: string) => p.industries.find((i) => i.id === id)?.name ?? id;
  const roleQ = q.trim();

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-header-height))] flex-col">
      {/* 관심 기업 줄 */}
      <div className="flex items-center border-b border-border bg-bg-sunken">
        <span className="border-r border-border px-5 py-3 text-label text-text-secondary">내 관심 기업</span>
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
          {watched.ids.length === 0 && <span className="px-2 text-caption text-text-secondary">아직 없어요. 기업을 골라 관심 저장해 보세요.</span>}
          {watched.ids.map((id) => {
            const c = byId.get(id);
            if (!c) return null;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={sel === id}
                onClick={() => setSel(linkOf.has(id) ? id : null)}
                className={cn("flex h-9 items-center gap-2 rounded-element px-3 text-label hover:bg-overlay-hover", sel === id && "bg-bg-selected font-semibold")}
              >
                <span aria-hidden className="size-2.5 rounded-[1px] bg-graph-saved" />
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_340px]">
        {/* 직무 트리 */}
        <aside className="hidden border-r border-border bg-bg-sunken lg:block" aria-label="직무 목록">
          <label className="mx-3 my-3 flex h-[38px] items-center gap-2 rounded-element bg-bg-tonal px-3 text-text-secondary">
            <Search className="size-4" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="직무 검색" className="w-full bg-transparent text-label outline-none placeholder:text-text-secondary" />
          </label>
          <nav>
            {p.families.map((f) => {
              const jobs = p.roles.filter((r) => r.groupId === f.id && (!roleQ || r.name.includes(roleQ)));
              if (!jobs.length) return null;
              return (
                <div key={f.id} className="border-b border-border py-2">
                  <p className="px-4 py-1 text-label-strong">{f.name}</p>
                  {jobs.map((r) => {
                    const cur = r.id === p.job.id;
                    const n = p.linkCounts[r.id] ?? 0;
                    return (
                      <Link
                        key={r.id}
                        href={`/explore/map?job=${r.id}`}
                        aria-current={cur ? "true" : undefined}
                        className={cn(
                          "mx-2 flex h-9 items-center justify-between rounded-element px-3 text-label hover:bg-overlay-hover",
                          cur && "bg-bg-selected font-semibold",
                          !n && "text-text-secondary",
                        )}
                      >
                        {r.name}
                        <span className="figures text-data-sm">{n ? `(${n})` : "–"}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* 지도 */}
        <section className="flex min-w-0 flex-col border-r border-border">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Kicker>직무 맵</Kicker>
              <div className="mt-2 flex items-center gap-2">
                <h1 className="text-heading-1">{p.job.name}</h1>
                <button type="button" aria-expanded={tip} onClick={() => setTip((t) => !t)} className="rounded-inner p-1 text-text-secondary hover:bg-overlay-hover" aria-label="직무 맵 읽는 법">
                  <HelpCircle className="size-5" />
                </button>
              </div>
              <p className="text-support">
                연결 기업 <span className="figures">{p.links.length}</span>곳 · 실제 공고 근거 <span className="figures">{postingCount}</span>곳
              </p>
              {tip && (
                <p className="mt-2 max-w-[34rem] rounded-element bg-bg-inverted p-3 text-caption text-text-inverted">
                  안쪽 궤도는 실제 공고가 있는 기업, 바깥 궤도는 업종과 사업보고서로 추정한 기업이에요. 네모 크기는 최근 사업연도 매출이에요. 기업을 누르면 이 직무가 있는 사업부가 펼쳐져요.
                </p>
              )}
            </div>
            <div className="flex overflow-hidden rounded-element border border-border-emphasized text-label">
              <label className="flex items-center gap-2 border-r border-border px-3 py-2">
                <span className="text-text-secondary">규모</span>
                <select value={size} onChange={(e) => setSize(e.target.value as SizeFilter)} className="bg-transparent font-semibold outline-none">
                  {(Object.keys(SIZE_LABEL) as SizeFilter[]).map((k) => (
                    <option key={k} value={k}>{SIZE_LABEL[k]}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 px-3 py-2">
                <span className="text-text-secondary">업종</span>
                <select value={ind} onChange={(e) => setInd(e.target.value)} className="bg-transparent font-semibold outline-none">
                  <option value="all">전체</option>
                  {p.industries.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="relative flex-1 bg-graph-canvas">
            <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} className="h-full w-full" role="group" aria-label={`${p.job.name} 직무와 연결된 기업`}>
              <circle cx={MAP.cx} cy={MAP.cy} r={MAP.rInner} fill="none" stroke="var(--color-graph-orbit)" strokeDasharray="1.5 5" strokeLinecap="round" />
              <circle cx={MAP.cx} cy={MAP.cy} r={MAP.rOuter} fill="none" stroke="var(--color-graph-orbit)" strokeDasharray="1.5 5" strokeLinecap="round" />
              {wedges.map((w) => {
                const a = (w.mid * Math.PI) / 180;
                return (
                  <text key={w.industryId} x={MAP.cx + 200 * Math.cos(a)} y={MAP.cy + 200 * Math.sin(a)} textAnchor="middle" className="fill-text-secondary text-[11px]">
                    {indName(w.industryId)}
                  </text>
                );
              })}
              {nodes.map((n) => {
                const l = linkOf.get(n.id)!;
                const on = n.id === sel;
                return (
                  <line
                    key={`e-${n.id}`}
                    x1={MAP.cx} y1={MAP.cy} x2={n.x} y2={n.y}
                    stroke={on ? "var(--color-graph-job)" : "var(--color-graph-edge)"}
                    strokeWidth={on ? 2 : 1}
                    strokeDasharray={l.basis === "estimated" ? "4 4" : undefined}
                    opacity={sel && !on ? 0.28 : 1}
                  />
                );
              })}
              {selNode &&
                segs.map((s, k) => {
                  const b = branches[k];
                  const has = s.jobRoleIds.includes(p.job.id);
                  return (
                    <g key={s.id}>
                      <line x1={selNode.x} y1={selNode.y} x2={b.x} y2={b.y} stroke={has ? "var(--color-graph-division)" : "var(--color-graph-node-dim)"} />
                      <a href={has ? `/company/${s.companyId}/segment/${s.id}?job=${p.job.id}` : `/company/${s.companyId}`} aria-label={`${s.name} 사업부 보기`}>
                        <rect x={b.x - 6} y={b.y - 6} width={12} height={12} rx={2} fill={has ? "var(--color-graph-division)" : "var(--color-graph-canvas)"} stroke={has ? "var(--color-graph-division)" : "var(--color-graph-node-dim)"} />
                        <text x={b.x + (b.x < selNode.x ? -10 : 10)} y={b.y + 4} textAnchor={b.x < selNode.x ? "end" : "start"} className={cn("text-[12px] font-semibold", has ? "fill-text-primary" : "fill-text-secondary")} style={{ paintOrder: "stroke", stroke: "var(--color-graph-canvas)", strokeWidth: 4 }}>
                          {s.shortName}
                          <tspan className="figures font-normal fill-text-secondary"> {formatEokShort(s.revenue)}{s.calculated ? " (계산)" : ""}</tspan>
                        </text>
                      </a>
                    </g>
                  );
                })}
              {nodes.map((n) => (
                <CompanyNode key={n.id} n={n} c={byId.get(n.id)!} saved={watched.has(n.id)} selected={n.id === sel} dim={!!sel && n.id !== sel} onPick={() => setSel(n.id === sel ? null : n.id)} />
              ))}
              <g>
                <rect x={MAP.cx - 56} y={MAP.cy - 20} width={112} height={40} rx={4} fill="var(--color-graph-job)" />
                <text x={MAP.cx} y={MAP.cy + 6} textAnchor="middle" className="fill-on-accent text-[16px] font-bold">{p.job.name}</text>
              </g>
            </svg>
            {nodes.length === 0 && (
              <div className="absolute inset-x-6 top-6 rounded-container border border-border bg-bg-surface p-4 text-body">
                이 조건에 맞는 기업이 없어요. 규모나 업종 필터를 바꿔 보세요.
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-border px-6 py-3 text-caption text-text-secondary">
            <span>── 실제 공고 근거</span>
            <span>┈┈ 추정 연결</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-[1px] bg-graph-saved" />관심 저장</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-[1px] bg-graph-node" />크기 = 매출</span>
            <span className="flex items-center gap-1"><i className="size-2.5 rounded-[1px] border border-dashed border-graph-node" />수치 연결 전</span>
          </div>
        </section>

        {/* 정보 패널 */}
        <aside className="px-6 py-5" aria-live="polite">
          {!selCo ? (
            <div className="space-y-5">
              <Kicker>직무 요약</Kicker>
              <div>
                <h2 className="text-heading-2">{p.job.name}</h2>
                <p className="mt-1 text-body text-text-secondary">{p.job.description}</p>
              </div>
              <div className="grid grid-cols-2 overflow-hidden rounded-element border border-border">
                <div className="border-r border-border p-3"><p className="text-caption text-text-secondary">연결 기업</p><p className="figures text-figure">{p.links.length}</p></div>
                <div className="p-3"><p className="text-caption text-text-secondary">실제 공고 근거</p><p className="figures text-figure">{postingCount}</p></div>
              </div>
              <div>
                <p className="text-caption text-text-secondary">매출 순 · 누르면 맵에서 보여드려요</p>
                <ol className="mt-2">
                  {ranked.map((c, k) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setSel(c.id)} className="grid w-full grid-cols-[28px_1fr_auto] items-center gap-2 rounded-element px-2 py-2 text-left hover:bg-overlay-hover">
                        <span className="figures text-data-sm text-text-secondary">{String(k + 1).padStart(2, "0")}</span>
                        <span>
                          <span className="block text-label-strong">{c.name}</span>
                          <span className="block text-caption text-text-secondary">{indName(c.industryId)} · {linkOf.get(c.id)?.basis === "posting" ? "실제 공고" : "추정"}</span>
                        </span>
                        <span className="figures text-data">{formatEokShort(c.revenue)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <CompanyPanel c={selCo} job={p.job} basis={linkOf.get(selCo.id)!.basis} segs={segs} saved={watched.has(selCo.id)} onToggle={() => watched.toggle(selCo.id)} onClose={() => setSel(null)} />
          )}
        </aside>
      </div>
    </div>
  );
}

function CompanyNode({ n, c, saved, selected, dim, onPick }: { n: NodePos; c: Company; saved: boolean; selected: boolean; dim: boolean; onPick: () => void }) {
  const noData = c.revenue == null;
  const half = n.size / 2;
  const side = selected ? "t" : n.side; // branches fan out to the sides of a selected company, so its label moves above
  const lx = side === "l" ? n.x - half - 8 : side === "r" ? n.x + half + 8 : n.x;
  const ly = side === "t" ? n.y - half - 24 : side === "b" ? n.y + half + 16 : n.y + 4;
  const anchor = side === "l" ? "end" : side === "r" ? "start" : "middle";
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${c.name}, 매출 ${formatEokShort(c.revenue)}`}
      onClick={onPick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick())}
      className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[3]"
      opacity={dim ? 0.28 : 1}
    >
      {selected && <rect x={n.x - half - 4} y={n.y - half - 4} width={n.size + 8} height={n.size + 8} rx={3} fill="none" stroke="var(--color-border-strong)" strokeWidth={2} />}
      <rect
        x={n.x - half} y={n.y - half} width={n.size} height={n.size} rx={2}
        fill={noData ? "var(--color-graph-canvas)" : saved ? "var(--color-graph-saved)" : "var(--color-graph-node)"}
        stroke={saved ? "var(--color-graph-saved)" : "var(--color-graph-node)"}
        strokeDasharray={noData ? "3 2" : undefined}
      />
      <text x={lx} y={ly} textAnchor={anchor} className="fill-text-primary text-[12px] font-semibold" style={{ paintOrder: "stroke", stroke: "var(--color-graph-canvas)", strokeWidth: 4 }}>
        {c.name}
        <tspan x={lx} dy={14} className="figures fill-text-secondary text-[11px] font-normal">{formatEokShort(c.revenue)}</tspan>
      </text>
    </g>
  );
}

function CompanyPanel({ c, job, basis, segs, saved, onToggle, onClose }: { c: Company; job: JobRole; basis: "posting" | "estimated"; segs: BusinessSegment[]; saved: boolean; onToggle: () => void; onClose: () => void }) {
  const withJob = segs.filter((s) => s.jobRoleIds.includes(job.id));
  return (
    <div className="space-y-5">
      <Kicker right={<button type="button" onClick={onClose} className="text-caption text-text-secondary hover:underline">직무 요약으로</button>}>선택한 기업</Kicker>
      <div>
        <h2 className="text-heading-2">{c.name}</h2>
        {c.basisNote && <p className="text-support">{c.basisNote} 기준</p>}
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-element border border-border">
        <div className="border-r border-border p-3"><p className="text-caption text-text-secondary">{c.fiscalYear ?? "최근"} 매출</p><p className="figures text-figure">{formatEokShort(c.revenue)}</p></div>
        <div className="p-3"><p className="text-caption text-text-secondary">영업이익</p><p className="figures text-figure">{formatEokShort(c.operatingIncome)}</p></div>
      </div>
      {c.source ? <SourceLine p={c.source} /> : <p className="text-caption text-text-secondary">수치 연결 전이에요. 공시가 수집되면 채워져요.</p>}
      <p className="flex items-center gap-2 text-label">
        {job.name} 연결 <TrustLabel p={{ kind: basis === "posting" ? "filing" : "estimate", text: basis === "posting" ? "실제 공고 근거" : "추정" }} />
      </p>
      {segs.length > 0 && (
        <div>
          <p className="text-caption text-text-secondary">이 직무가 있는 사업부</p>
          <ul className="mt-1">
            {withJob.length === 0 && <li className="py-2 text-body text-text-secondary">사업부 정보에서 이 직무를 찾지 못했어요.</li>}
            {withJob.map((s) => (
              <li key={s.id} className="border-b border-border">
                <Link href={`/company/${c.id}/segment/${s.id}?job=${job.id}`} className="flex items-center justify-between gap-2 px-1 py-3 hover:bg-overlay-hover">
                  <span className="flex items-center gap-2 text-label-strong"><i className="size-2.5 rounded-[1px] bg-graph-division" />{s.name}</span>
                  <span className="figures text-data">{formatEokShort(s.revenue)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {c.hasDetail && (
          <Link href={`/company/${c.id}`} className={btn.primary}>
            기업 상세 보기 <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <button type="button" onClick={onToggle} aria-pressed={saved} className={btn.secondary}>
          <Heart className={cn("size-4", saved && "fill-current")} aria-hidden /> {saved ? "관심 저장됨" : "관심 저장"}
        </button>
      </div>
    </div>
  );
}
