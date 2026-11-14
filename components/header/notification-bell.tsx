"use client";
// 알림함 (specs/explore FR-DISC-04, teammate spec header): bell with unread count; items = recent filings of my saved companies.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type Note = { id: string; tag: string; title: string; date: string; href: string; company: string };
const KEY = "lg:seen-notes";

export function NotificationBell({ notes, demo }: { notes: Note[]; demo: boolean }) {
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after hydration
      setSeen(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      /* storage unavailable */
    }
  }, []);
  const unread = notes.filter((n) => !seen.includes(n.id)).length;
  function markAll() {
    const ids = notes.map((n) => n.id);
    setSeen(ids);
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }
  return (
    <DropdownMenu onOpenChange={(o) => !o && markAll()}>
      <DropdownMenuTrigger className="relative flex size-10 items-center justify-center rounded-element hover:bg-overlay-hover">
        <Bell className="size-5" aria-hidden />
        <span className="sr-only">{unread ? `${"\uC54C\uB9BC"} ${unread}${"\uAC1C \uC548 \uC77D\uC74C"}` : "\uC54C\uB9BC"}</span>
        {unread > 0 && <span aria-hidden className="figures absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-bg-inverted text-data-sm text-text-inverted">{unread}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>알림</span>
          {demo && <span className="text-caption font-normal text-text-secondary">데모</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notes.length === 0 && <p className="px-2 py-4 text-center text-caption text-text-secondary">관심 기업을 저장하면 새 공시를 알려 드려요.</p>}
        {notes.map((n) => (
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
