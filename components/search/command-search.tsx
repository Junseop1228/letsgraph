"use client";
// 기업·직무 검색 (specs/company FR-CORP-04). cmdk command palette: Ctrl/⌘+K or the header button.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { formatEokShort } from "@/lib/format";
import type { Company } from "@/lib/contracts/domain";

export type SearchItem = { kind: "company" | "job"; id: string; label: string; hint: string; href: string; revenue?: number | null; ready?: boolean };

export function CommandSearch({ items, industryNames = {} }: { items: SearchItem[]; industryNames?: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<SearchItem[]>([]);
  const router = useRouter();

  // companies come from the server search while typing (the catalogue is too big to ship to the browser)
  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/catalog/search?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((cs: Company[]) => {
          if (!live) return;
          setFound(
            cs.map((c) => ({
              kind: "company" as const,
              id: c.id,
              label: c.name,
              hint: `${industryNames[c.industryId] ?? ""}${c.hasDetail ? "" : " · 상세 준비 중"}`,
              href: `/company/${c.id}`,
              revenue: c.revenue,
              ready: c.hasDetail,
            })),
          );
        })
        .catch(() => {});
    }, 150);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, industryNames]);
  const typing = q.trim() !== "";
  // companies with a detail page answer at once (cmdk filters them locally); the server search adds the rest
  const featured = items.filter((i) => i.kind === "company");
  const companies = typing ? [...found, ...featured.filter((f) => !found.some((x) => x.id === f.id))] : featured;
  const shown = [...items.filter((i) => i.kind === "job"), ...companies];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden h-[38px] w-60 items-center gap-2 rounded-element bg-bg-tonal px-3 text-label text-text-secondary hover:bg-bg-tonal-hover md:flex">
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">직무, 기업 검색</span>
        <kbd className="figures rounded-inner bg-bg-surface px-1.5 text-data-sm">Ctrl K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label="검색" className="flex size-10 items-center justify-center rounded-element hover:bg-overlay-hover md:hidden">
        <Search className="size-5" aria-hidden />
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="직무와 기업 검색"
        overlayClassName="fixed inset-0 z-50 bg-black/30"
        contentClassName="fixed left-1/2 top-[15vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-container border border-border bg-bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-text-secondary" aria-hidden />
          <Command.Input value={q} onValueChange={setQ} placeholder="직무나 기업 이름" className="h-12 w-full bg-transparent text-body outline-none placeholder:text-text-secondary" />
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-body text-text-secondary">찾는 직무나 기업이 없어요.</Command.Empty>
          {(["job", "company"] as const).map((kind) => (
            <Command.Group key={kind} heading={kind === "job" ? "직무" : "기업"} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-text-secondary">
              {shown.filter((i) => i.kind === kind && (typing || i.ready !== false)).map((i) => (
                <Command.Item
                  key={`${kind}:${i.id}`}
                  value={`${i.label} ${i.hint}`}
                  onSelect={() => go(i.href)}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-element px-3 py-2.5 text-label data-[selected=true]:bg-bg-selected"
                >
                  <span>
                    <span className="block text-label-strong">{i.label}</span>
                    <span className="block text-caption text-text-secondary">{i.hint}</span>
                  </span>
                  {i.kind === "company" && <span className="figures text-data text-text-secondary">{formatEokShort(i.revenue ?? null)}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  );
}
