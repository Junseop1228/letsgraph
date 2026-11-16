"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

// whitespace-nowrap: body uses overflow-wrap:anywhere, so narrow screens broke tab names per letter (audit C-1)
const itemBase = "h-9 shrink-0 whitespace-nowrap rounded-element px-2 sm:px-3.5 inline-flex items-center text-label-strong transition-colors";

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1">
      {MAIN_NAV.map((item) => {
        const active = item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(itemBase, active ? "bg-bg-selected text-text-primary" : "text-text-secondary hover:bg-overlay-hover hover:text-text-primary")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same links without the active state; shown while the pathname is not known yet (Suspense fallback). */
export function MainNavFallback() {
  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1">
      {MAIN_NAV.map((item) => (
        <Link key={item.id} href={item.href} className={cn(itemBase, "text-text-secondary")}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
