"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/use-memo -- liked jobs, URL switches and breakpoints are read once on mount; graph data is keyed on joined ids */
// 탐색 > 나의 취업 그래프 (specs/explore FR-MAP-03). Stars = my liked jobs (max 5, toggled in the floating bar).
// Layout (decisions 2026-11-15: Toss UX + Apple Liquid Glass): the graph fills the screen; controls and one detail card
// float above it on glass (styles/glass.css). Toss: one thing per card, big figures with small captions, 해요체, no helper
// sentences ("잡초 뽑기"), but the 실제 공고 / 추정 trust label always stays. Mobile: the card becomes a bottom sheet.
import { reasonLine, type CompanyType } from "@/lib/explore/company-type";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, BriefcaseBusiness, ChevronLeft, ChevronRight, EyeOff, Heart, List, Network, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { BusinessSegment, Company, Industry, JobLink, JobRole } from "@/lib/contracts/domain";
import { buildGraph, type GNode } from "@/lib/explore/graph";
import { withExtras } from "@/lib/explore/stars";
import { formatEokShort } from "@/lib/format";
import { readLikedJobs, useIdList, useWatched } from "@/lib/client/local-state";
import { FlowGraph } from "@/components/explore/flow-graph";
import { DECK_AGAIN_PATH, saveCompanyType, saveIndustryChoice } from "@/lib/onboarding";
import { jobsOutsideChoice, relatedIndustries, relaxNotes } from "@/lib/explore/conditions";
import { ConditionButton, ConditionPanel } from "@/components/explore/condition-control";
import { IndustryIcon } from "@/components/explore/industry-icon";
import { useLiquidGlass, type Lens } from "@/components/explore/use-liquid-glass";
import { track } from "@/lib/client/analytics";
import { SourceLine, TrustLabel, btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

type Props = {
  roles: JobRole[];
  industries: Industry[];
  companies: Company[];
  links: JobLink[]; // all jobs: stored links + top companies of each picked industry (lib/explore/load.ts)
  /** reviewed companies per industry */
  industryTotals: Record<string, number>;
  segmentsByCompany: Record<string, BusinessSegment[]>;
  watchedInitial: string[];
  initialJob: string;
  /** onboarding company-type card (D 2026-11-17 step 5b); null = any */
  companyType?: CompanyType | null;
  /** industries picked on the onboarding card or the condition panel (cookie lg_industries); null = each job's closest */
  chosenIndustries?: string[] | null;
  /** industries shown unfiltered because no company of that type was there (relax-and-tell) */
  relaxed?: string[];
  /** place of each top company in its industry's list on the graph (lib/explore/load.ts) */
  ranks?: Record<string, number>;
};

type Sel = { kind: "job"; job: string } | { kind: "ind"; job: string; ind: string } | { kind: "co"; job: string; co: string } | null;

// The graph keeps clear of the floating layers when it fits itself.
const FIT_WIDE = { top: "84px", right: "404px", bottom: "76px", left: "48px" } as const;
const FIT_NARROW = { top: "120px", right: "20px", bottom: "48%", left: "20px" } as const; // bar + zoom pill rows (audit M-5)
// glass lens per layer (use-liquid-glass.ts): capsules bend in a narrow rim; the card has a wider rim and a frosted middle for reading
const LENS_PILL: Lens = { bezel: 14, scale: 34, frost: 0.3 };
const LENS_CARD: Lens = { bezel: 22, scale: 52, frost: 3 };

export function ExploreGraph(p: Props) {
  const watched = useWatched(p.watchedInitial);
  // D4: companies the visitor added by search or took off the graph (kept in this browser)
  const added = useIdList("lg:graph-added");
  const hidden = useIdList("lg:graph-hidden");
  const [fetched, setFetched] = useState<Company[]>([]);
  const roleById = useMemo(() => new Map(p.roles.map((r) => [r.id, r])), [p.roles]);
  const coById = useMemo(() => {
    const m = new Map(p.companies.map((c) => [c.id, c]));
    for (const c of fetched) if (!m.has(c.id)) m.set(c.id, c);
    return m;
  }, [p.companies, fetched]);
  const companyIndustry = useMemo(() => Object.fromEntries([...coById.values()].map((c) => [c.id, c.industryId])), [coById]);
  const linkedJobs = useMemo(() => new Set(p.links.map((l) => l.jobRoleId)), [p.links]);
  const keep = (cs: Company[]) => setFetched((f) => [...f, ...cs.filter((c) => !f.some((x) => x.id === c.id))]);

  // watched or added companies outside the server slice are fetched once
  const extraIds = [...new Set([...watched.ids, ...added.ids])];
  useEffect(() => {
    const want = extraIds.filter((id) => !coById.has(id));
    if (!want.length) return;
    let live = true;
    fetch(`/api/catalog/companies?ids=${encodeURIComponent(want.join(","))}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((cs: Company[]) => live && keep(cs))
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraIds.join(","), coById]);

  const [myJobs, setMyJobs] = useState<string[]>([p.initialJob]);
  const [on, setOn] = useState<string[]>([p.initialJob]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [vertical, setVertical] = useState(false);
  const [wide, setWide] = useState(true);
  const [condOpen, setCondOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const applied = useRef(false);

  // liked jobs are read once per primary job: a condition change (router.refresh) brings new props but keeps the stars I turned on
  useEffect(() => {
    const liked = readLikedJobs().filter((j) => roleById.has(j) && linkedJobs.has(j));
    const list = [p.initialJob, ...liked.filter((j) => j !== p.initialJob)].slice(0, 5);
    setMyJobs(list);
    setOn(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.initialJob]);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 767px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const upd = () => {
      setVertical(narrow.matches);
      setWide(lg.matches);
    };
    upd();
    narrow.addEventListener("change", upd);
    lg.addEventListener("change", upd);
    return () => {
      narrow.removeEventListener("change", upd);
      lg.removeEventListener("change", upd);
    };
  }, []);

  const stars = on.map((j) => roleById.get(j)).filter((r): r is JobRole => !!r);
  const links = useMemo(
    () =>
      withExtras(
        p.links,
        on,
        extraIds.map((id) => coById.get(id)).filter((c): c is Company => !!c).map((c) => ({ id: c.id, industryId: c.industryId })),
        hidden.ids,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.links, on.join(","), extraIds.join(","), hidden.ids.join(","), coById],
  );
  const data = useMemo(
    () => buildGraph({ jobs: stars, industries: p.industries, companies: [...coById.values()], links, totals: p.industryTotals, saved: watched.ids, expanded, vertical }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [on.join(","), watched.ids.join(","), expanded, vertical, links],
  );

  const indName = (id: string) => p.industries.find((i) => i.id === id)?.name ?? id;
  const linksOf = (job: string) => links.filter((l) => l.jobRoleId === job);

  // ---- conditions (D 2026-11-17 step 5c): same cookies as the onboarding deck; the server re-selects the companies
  const chosen = p.chosenIndustries ?? [];
  const indChoices = useMemo(() => {
    const all = p.industries.map((i) => ({ id: i.id, name: i.name, count: p.industryTotals[i.id] ?? 0 }));
    const rel = relatedIndustries(myJobs, all);
    return [...rel, ...all.filter((i) => chosen.includes(i.id) && !rel.some((r) => r.id === i.id))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.industries, p.industryTotals, myJobs.join(","), chosen.join(",")]);
  // relax-and-tell only for what the stars I have on show now
  const shownInds = new Set(links.filter((l) => on.includes(l.jobRoleId)).map((l) => companyIndustry[l.companyId]));
  const notes = relaxNotes({
    relaxedIndustries: (p.relaxed ?? []).filter((id) => shownInds.has(id)).map(indName),
    outsideJobs: jobsOutsideChoice(on, p.industryTotals, chosen).map((j) => roleById.get(j)?.name ?? j),
    type: p.companyType ?? null,
  });
  const closeCond = useCallback(() => setCondOpen(false), []);
  function applyConditions(inds: string[], type: CompanyType | null) {
    saveIndustryChoice(inds);
    saveCompanyType(type);
    track("graph_conditions_change", { industries: inds.length, type: type ?? "any" });
    setCondOpen(false);
    setSel(null);
    setExpanded(null);
    applied.current = true;
    startTransition(() => router.refresh());
  }
  // after the new graph arrives, say whether the conditions had to be relaxed
  useEffect(() => {
    if (pending || !applied.current) return;
    applied.current = false;
    toast(notes.length ? "조건을 조금 넓혀서 보여드려요" : "조건을 바꿨어요");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);
  function addCompany(c: Company) {
    keep([c]);
    added.add(c.id);
    hidden.remove(c.id);
    toast(`${c.name}을(를) 그래프에 넣었어요`);
  }
  function hideCompany(id: string, job: string) {
    hidden.add(id);
    added.remove(id);
    setSel({ kind: "job", job });
    toast("그래프에서 뺐어요");
  }
  const label = (n: GNode) =>
    n.type === "center"
      ? `내 직무 ${n.label}`
      : n.type === "ind"
        ? `${n.label}, ${roleById.get(n.job)?.name} 연결 기업 ${n.count}곳`
        : `${n.label}, ${n.basis === "posting" ? "실제 공고 근거" : "추정 연결"}`;

  function openIndustry(job: string, ind: string) {
    track("graph_industry_open", { industry: ind });
    setExpanded(`${job}|${ind}`);
    setSel({ kind: "ind", job, ind });
  }
  function onSelect(n: GNode) {
    if (n.type === "center") setSel({ kind: "job", job: n.job });
    else if (n.type === "ind") {
      const key = `${n.job}|${n.ref}`;
      if (expanded === key) {
        setExpanded(null);
        setSel({ kind: "job", job: n.job });
      } else openIndustry(n.job, n.ref);
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

  const barRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLUListElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  useLiquidGlass(barRef, LENS_PILL);
  useLiquidGlass(legendRef, LENS_PILL, view === "graph");
  // over the list the card must stay readable: no clear lens, frosted fill only (list view looked broken on phones)
  useLiquidGlass(cardRef, LENS_CARD, view === "graph");

  const cardJob = sel?.job ?? stars[0]?.id ?? p.initialJob;
  const cardKey = !sel ? `job:${cardJob}` : selectedId!;

  return (
    <div aria-busy={pending} className="relative h-[calc(100dvh-var(--spacing-header-height)-var(--spacing-tab-bar-height))] min-h-[560px] overflow-hidden bg-graph-canvas sm:h-[calc(100dvh-var(--spacing-header-height))]">
      {/* the graph (or the list) fills the screen */}
      {view === "graph" ? (
        <div className="absolute inset-0">
          <FlowGraph
            data={data}
            selectedId={selectedId}
            onSelect={onSelect}
            onBackground={() => setSel(null)}
            companyIndustry={companyIndustry}
            label={label}
            fitPadding={wide ? FIT_WIDE : FIT_NARROW}
            fitMinZoom={wide ? undefined : 0.55}
            controlsClassName={wide ? "bottom-4 right-4" : "left-3 top-16"}
          />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pb-[52vh] pt-20 lg:right-101 lg:pb-10 lg:pl-8 lg:pr-8">
          <ListView stars={stars} links={links} coById={coById} indName={indName} saved={watched.ids} onPick={(job, co) => setSel({ kind: "co", job, co })} />
        </div>
      )}

      {/* floating glass bar: my jobs + view switch */}
      <div ref={barRef} className="lg-glass absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-full p-1 lg:left-4 lg:top-4 lg:max-w-[calc(100%-26rem)]">
        {myJobs.map((j) => (
          <button key={j} type="button" aria-pressed={on.includes(j)} onClick={() => toggleJob(j)} className={cn("h-8 shrink-0 rounded-full px-3.5 text-label transition-colors", on.includes(j) ? "lg-seg-on font-semibold text-text-primary" : "text-text-secondary hover:text-text-primary")}>
            {roleById.get(j)?.name}
          </button>
        ))}
        {/* visible text so the way back to the card deck is easy to find (user 2026-11-16); icon only below lg, like the view switch (audit M-7) */}
        <Link href={DECK_AGAIN_PATH} aria-label="직무 더 고르기" className="flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-label text-text-secondary hover:bg-overlay-hover hover:text-text-primary lg:px-3">
          <Plus className="size-4" aria-hidden />
          <span aria-hidden className="hidden lg:inline">직무 더 고르기</span>
        </Link>
        <ConditionButton
          industryCount={chosen.length}
          type={p.companyType ?? null}
          relaxed={notes.length > 0}
          open={condOpen}
          pending={pending}
          onClick={() => setCondOpen((o) => !o)}
        />
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />
        <div role="group" aria-label="보기 방식" className="flex shrink-0 gap-0.5">
          <button type="button" aria-pressed={view === "graph"} aria-label="그래프" onClick={() => setView("graph")} className={cn("flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-label lg:px-3", view === "graph" ? "lg-seg-on text-text-primary" : "text-text-secondary hover:text-text-primary")}>
            <Network className="size-4" aria-hidden />
            <span aria-hidden className="hidden lg:inline">그래프</span>
          </button>
          <button type="button" aria-pressed={view === "list"} aria-label="목록" onClick={() => setView("list")} className={cn("flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-label lg:px-3", view === "list" ? "lg-seg-on text-text-primary" : "text-text-secondary hover:text-text-primary")}>
            <List className="size-4" aria-hidden />
            <span aria-hidden className="hidden lg:inline">목록</span>
          </button>
        </div>
      </div>

      {condOpen && <ConditionPanel industries={indChoices} chosen={chosen} type={p.companyType ?? null} notes={notes} onApply={applyConditions} onClose={closeCond} />}

      {/* how to read the graph: one glass line instead of a boxed legend */}
      {view === "graph" && (
        <ul ref={legendRef} aria-label="그래프 읽는 법" className="lg-glass absolute bottom-4 left-4 z-10 hidden items-center gap-4 rounded-full px-4 py-2 text-caption text-text-secondary lg:flex">
          <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-full bg-graph-job" />내 직무</li>
          <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-full border border-border-emphasized bg-bg-tonal" />산업</li>
          {/* every mark the graph draws has a line here (audit M-1, M-2) */}
          <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-full bg-graph-saved" />관심 기업</li>
          <li className="flex items-center gap-1.5"><i aria-hidden className="size-2.5 rounded-full border border-graph-node" />기업 · 클수록 매출이 커요</li>
        </ul>
      )}

      {/* detail card: floating glass card on wide screens, bottom sheet on narrow ones */}
      <aside ref={cardRef} aria-live="polite" aria-label="자세히" className="lg-glass lg-glass-card absolute inset-x-2 bottom-2 z-20 flex max-h-[46%] flex-col overflow-hidden rounded-sheet lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:max-h-[calc(100%-5.25rem)] lg:w-floating-card-width">
        {/* only the content scrolls, so the glass rim and lens stay put */}
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:p-6">
        <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-border-emphasized lg:hidden" />
        <div key={cardKey} className="lg-card-in space-y-5">
          {!sel || sel.kind === "job" ? (
            <JobCard
              job={roleById.get(cardJob)!}
              links={linksOf(cardJob)}
              coById={coById}
              indName={indName}
              totals={p.industryTotals}
              onOpen={openIndustry}
              onAdd={addCompany}
              hiddenCount={hidden.ids.length}
              onUnhide={hidden.clear}
            />
          ) : sel.kind === "ind" ? (
            <IndustryCard
              job={roleById.get(sel.job)!}
              ind={sel.ind}
              indName={indName}
              links={linksOf(sel.job).filter((l) => coById.get(l.companyId)?.industryId === sel.ind)}
              total={p.industryTotals[sel.ind] ?? 0}
              coById={coById}
              otherJobs={myJobs.filter((j) => j !== sel.job && linksOf(j).some((l) => coById.get(l.companyId)?.industryId === sel.ind)).map((j) => roleById.get(j)!.name)}
              saved={watched.ids}
              onPick={(co) => setSel({ kind: "co", job: sel.job, co })}
              onBack={() => { setExpanded(null); setSel({ kind: "job", job: sel.job }); }}
            />
          ) : (
            <CompanyCard
              c={coById.get(sel.co)!}
              job={roleById.get(sel.job)!}
              basis={linksOf(sel.job).find((l) => l.companyId === sel.co)?.basis ?? "estimated"}
              evidence={linksOf(sel.job).find((l) => l.companyId === sel.co)?.evidence}
              segs={p.segmentsByCompany[sel.co] ?? []}
              saved={watched.has(sel.co)}
              onToggle={() => toggleWatch(sel.co)}
              onHide={() => hideCompany(sel.co, sel.job)}
              backLabel={indName(companyIndustry[sel.co])}
              reason={reasonLine({
                basis: linksOf(sel.job).find((l) => l.companyId === sel.co)?.basis ?? "estimated",
                postings: linksOf(sel.job).find((l) => l.companyId === sel.co)?.evidence?.count,
                jobName: roleById.get(sel.job)!.name,
                industryName: indName(companyIndustry[sel.co]),
                rank: p.ranks?.[sel.co] ?? null,
                growth: coById.get(sel.co)?.revenueGrowth,
                type: p.companyType ?? null,
                relaxed: !!p.relaxed?.includes(companyIndustry[sel.co]),
              })}
              onBack={() => openIndustry(sel.job, companyIndustry[sel.co])}
            />
          )}
        </div>
        </div>
      </aside>
    </div>
  );
}

// ---- card parts ----------------------------------------------------------------------------------
function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="-ml-2 flex h-8 items-center gap-0.5 rounded-full pl-1 pr-3 text-label text-text-secondary hover:bg-overlay-hover hover:text-text-primary">
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-overlay-hover px-4 py-3">
      <p className="figures text-figure">
        {value}
        <span className="ml-0.5 text-label text-text-secondary">곳</span>
      </p>
      <p className="text-caption text-text-secondary">{label}</p>
    </div>
  );
}

function Row({ onClick, lead, title, sub, value }: { onClick: () => void; lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-overlay-hover">
        {lead}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-strong">{title}</span>
          {sub && <span className="block text-caption text-text-secondary">{sub}</span>}
        </span>
        {value && <span className="figures text-data text-text-secondary">{value}</span>}
        <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
      </button>
    </li>
  );
}

function JobCard({
  job,
  links,
  coById,
  indName,
  totals,
  onOpen,
  onAdd,
  hiddenCount,
  onUnhide,
}: {
  job: JobRole;
  links: JobLink[];
  coById: Map<string, Company>;
  indName: (id: string) => string;
  totals: Record<string, number>;
  onOpen: (job: string, ind: string) => void;
  onAdd: (c: Company) => void;
  hiddenCount: number;
  onUnhide: () => void;
}) {
  const byInd = new Map<string, JobLink[]>();
  for (const l of links) {
    const c = coById.get(l.companyId);
    if (c) byInd.set(c.industryId, [...(byInd.get(c.industryId) ?? []), l]);
  }
  const posting = links.filter((l) => l.basis === "posting").length;
  const size = (ind: string, ls: JobLink[]) => Math.max(totals[ind] ?? 0, ls.length);
  const companies = [...byInd.entries()].reduce((n, [ind, ls]) => n + size(ind, ls), 0);
  return (
    <>
      <header className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-graph-job text-text-inverted">
          <BriefcaseBusiness className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-heading-2">{job.name}</h1>
          <p className="text-caption text-text-secondary">{byInd.size}개 산업에서 뽑아요</p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2">
        <Stat value={companies} label="연결된 기업" />
        <Stat value={posting} label="실제 공고로 확인" />
      </div>
      <ul>
        {[...byInd.entries()].map(([ind, ls]) => (
          <Row
            key={ind}
            onClick={() => onOpen(job.id, ind)}
            lead={<span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-tonal"><IndustryIcon id={ind} className="size-4" /></span>}
            title={indName(ind)}
            sub={`기업 ${size(ind, ls)}곳 · 실제 공고 ${ls.filter((l) => l.basis === "posting").length}곳`}
          />
        ))}
      </ul>
      <p className="text-caption text-text-secondary">산업을 누르면 매출이 큰 기업부터 그래프에 펼쳐져요.</p>
      <AddCompany onAdd={onAdd} />
      {hiddenCount > 0 && (
        <button type="button" onClick={onUnhide} className="text-caption text-text-secondary underline underline-offset-2 hover:text-text-primary">
          뺀 기업 {hiddenCount}곳 다시 보이기
        </button>
      )}
    </>
  );
}

/** D4: search the catalogue and put a company on my graph (it joins the stars whose job relates to its industry). */
function AddCompany({ onAdd }: { onAdd: (c: Company) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Company[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((cs: Company[]) => live && setHits(cs))
        .catch(() => {});
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const shown = q.trim() ? hits : [];
  return (
    <div className="space-y-2">
      <label className="flex h-10 items-center gap-2 rounded-full bg-overlay-hover px-3 text-label">
        <Search className="size-4 shrink-0 text-text-secondary" aria-hidden />
        <span className="sr-only">그래프에 넣을 기업 찾기</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="기업을 찾아 그래프에 넣기" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-secondary" />
      </label>
      {shown.length > 0 && (
        <ul>
          {shown.slice(0, 5).map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label-strong">{c.name}</span>
                <span className="figures block text-caption text-text-secondary">{formatEokShort(c.revenue)}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onAdd(c);
                  setQ("");
                }}
                className={cn(btn.secondary, "h-8 rounded-full px-3")}
              >
                <Plus className="size-4" aria-hidden /> 넣기
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IndustryCard({ job, ind, indName, links, total, coById, otherJobs, saved, onPick, onBack }: { job: JobRole; ind: string; indName: (id: string) => string; links: JobLink[]; total: number; coById: Map<string, Company>; otherJobs: string[]; saved: string[]; onPick: (co: string) => void; onBack: () => void }) {
  const rows = [...links].sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1));
  return (
    <>
      <BackButton onClick={onBack}>{job.name}</BackButton>
      <header className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bg-tonal">
          <IndustryIcon id={ind} className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-heading-2">{indName(ind)}</h1>
          <p className="text-caption text-text-secondary">
            {job.name} 직무로 {Math.max(total, links.length)}곳과 이어져요
            {total > links.length && <> · 매출 상위 {links.length}곳</>}
          </p>
        </div>
      </header>
      {otherJobs.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
          내 다른 직무도 뽑아요
          {otherJobs.map((n) => <span key={n} className="h-6 rounded-full bg-bg-tonal px-2.5 leading-6 text-text-primary">{n}</span>)}
        </p>
      )}
      <ul>
        {rows.map((l) => {
          const c = coById.get(l.companyId)!;
          const isSaved = saved.includes(c.id);
          return (
            <Row
              key={c.id}
              onClick={() => onPick(c.id)}
              lead={<i aria-hidden className={cn("size-3 shrink-0 rounded-full border", isSaved ? "border-graph-saved bg-graph-saved" : "border-graph-node")} />}
              title={c.name}
              sub={l.basis === "posting" ? "실제 공고" : "추정"}
              value={formatEokShort(c.revenue)}
            />
          );
        })}
      </ul>
    </>
  );
}

function CompanyCard({ c, job, basis, evidence, segs, saved, onToggle, onHide, backLabel, reason, onBack }: { c: Company; job: JobRole; basis: "posting" | "estimated"; evidence?: { count: number; lastSeen: string }; segs: BusinessSegment[]; saved: boolean; onToggle: () => void; onHide: () => void; backLabel: string; reason: string; onBack: () => void }) {
  const withJob = segs.filter((s) => s.jobRoleIds.includes(job.id));
  return (
    <>
      <BackButton onClick={onBack}>{backLabel}</BackButton>
      <header>
        <h1 className="text-heading-1">{c.name}</h1>
        <p className="mt-1 flex items-center gap-2 text-caption text-text-secondary">
          {job.name} 연결 <TrustLabel p={{ kind: basis === "posting" ? "filing" : "estimate", text: basis === "posting" ? "실제 공고 근거" : "추정" }} />
        </p>
        {/* one reason line per company (D 2026-11-17 onboarding card flow) */}
        {reason && <p className="mt-1 text-body text-text-secondary">{reason}</p>}
        {/* POST-07: when the posting was last confirmed (sources stay on the server) */}
        {evidence && <p className="mt-1 text-caption text-text-secondary">최근 확인 {evidence.lastSeen.replaceAll("-", ".")}</p>}
      </header>
      <div>
        <p className="text-caption text-text-secondary">{c.fiscalYear ?? "최근"} 매출</p>
        <p className="figures text-figure-hero">{formatEokShort(c.revenue)}</p>
        <p className="mt-1 text-caption text-text-secondary">
          영업이익 <span className="figures text-text-primary">{formatEokShort(c.operatingIncome)}</span>
          {c.basisNote && <> · {c.basisNote} 기준</>}
        </p>
      </div>
      {withJob.length > 0 && (
        <ul>
          {withJob.map((s) => (
            <li key={s.id}>
              <Link href={`/company/${c.id}/segment/${s.id}?job=${job.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-overlay-hover">
                <span className="min-w-0 flex-1 truncate text-label-strong">{s.name}</span>
                <span className="figures text-data text-text-secondary">{formatEokShort(s.revenue)}</span>
                <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        {c.hasDetail && (
          <Link href={`/company/${c.id}`} className={cn(btn.primary, "flex-1 rounded-full")}>
            기업 상세 보기 <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <button type="button" onClick={onToggle} aria-pressed={saved} className={cn(btn.secondary, "rounded-full", !c.hasDetail && "flex-1")}>
          <Heart className={cn("size-4", saved && "fill-current")} aria-hidden /> {saved ? "관심 저장됨" : "관심 저장"}
        </button>
      </div>
      <button type="button" onClick={onHide} className="flex items-center gap-1.5 text-caption text-text-secondary hover:text-text-primary">
        <EyeOff className="size-3.5" aria-hidden /> 내 그래프에서 빼기
      </button>
      {c.source ? <SourceLine p={c.source} /> : <p className="text-caption text-text-secondary">수치 연결 전이에요.</p>}
    </>
  );
}

function ListView({ stars, links, coById, indName, saved, onPick }: { stars: JobRole[]; links: JobLink[]; coById: Map<string, Company>; indName: (id: string) => string; saved: string[]; onPick: (job: string, co: string) => void }) {
  return (
    <div className="mx-auto max-w-reading-max space-y-8">
      {stars.map((j) => {
        const ls = links.filter((l) => l.jobRoleId === j.id).sort((a, b) => (coById.get(b.companyId)?.revenue ?? -1) - (coById.get(a.companyId)?.revenue ?? -1));
        return (
          <section key={j.id}>
            <h2 className="text-heading-3">{j.name}</h2>
            <ul className="mt-2">
              {ls.map((l) => {
                const c = coById.get(l.companyId)!;
                return (
                  <Row
                    key={c.id}
                    onClick={() => onPick(j.id, c.id)}
                    lead={<span className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-tonal"><IndustryIcon id={c.industryId} className="size-4" /></span>}
                    title={<>{saved.includes(c.id) && <span className="sr-only">관심 기업, </span>}{c.name}</>}
                    sub={`${indName(c.industryId)} · ${l.basis === "posting" ? "실제 공고" : "추정"}`}
                    value={formatEokShort(c.revenue)}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
