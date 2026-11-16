"use client";
// 알림함 (specs/explore FR-DISC-04, teammate spec header): bell with unread count; items = recent filings of my saved companies.
// The server sends filings of every company with a detail page; the bell keeps the saved ones, newest first (audit C-2).
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWatched } from "@/lib/client/local-state";
import { cn } from "@/lib/utils";

export type Note = { id: string; companyId: string; tag: string; title: string; date: string; href: string; company: string };
const KEY = "lg:seen-notes";
const SHOWN = 3;

export function NotificationBell({ notes, watchedInitial, demo }: { notes: Note[]; watchedInitial: string[]; demo: boolean }) {
  const watched = useWatched(watchedInitial);
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after hydration
      setSeen(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const mine = notes
    .filter((n) => watched.ids.includes(n.companyId))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, SHOWN);
  const unread = mine.filter((n) => !seen.includes(n.id)).length;
  function markAll() {
    const ids = [...new Set([...seen, ...mine.map((n) => n.id)])];
    setSeen(ids);
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }
  return (
    <DropdownMenu onOpenChange={(o) => !o && markAll()}>
      <DropdownMenuTrigger className="relative flex size-10 shrink-0 items-center justify-center rounded-element hover:bg-overlay-hover">
        <Bell className="size-5" aria-hidden />
        <span className="sr-only">{unread ? `알림 ${unread}개 안 읽음` : "알림"}</span>
        {unread > 0 && <span aria-hidden className="figures absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-bg-inverted text-data-sm text-text-inverted">{unread}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>알림</span>
          {demo && <span className="text-caption font-normal text-text-secondary">데모</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mine.length === 0 && <p className="px-2 py-4 text-center text-caption text-text-secondary">관심 기업을 저장하면 새 공시를 알려 드려요.</p>}
        {mine.map((n) => (
          <DropdownMenuItem key={n.id} asChild>
            <Link href={n.href} className="flex items-start gap-2">
              <span aria-hidden className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", seen.includes(n.id) ? "bg-transparent" : "bg-text-primary")} />
              <span>
                <span className="block text-label"><span className="text-text-secondary">[{n.company} · {n.tag}]</span> {n.title}</span>
                <span className="figures block text-caption text-text-secondary">{n.date.replaceAll("-", ".")}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
