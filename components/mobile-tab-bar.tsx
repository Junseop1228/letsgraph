"use client";
// 모바일 하단 탭 바 (design/DESIGN.md LAY-1: mobile tab bar 60): below sm the four main tabs move from the header to
// the bottom of the screen, so the header keeps only the logo, search, theme, notifications and account and nothing
// is cut. Same tabs and active rule as the header (lib/nav.ts MAIN_NAV). Hidden from sm up, where the header has them.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Compass, Layers, Link2, type LucideIcon } from "lucide-react";
import { MAIN_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICON: Record<string, LucideIcon> = { explore: Compass, postings: Briefcase, manage: Layers, connect: Link2 };

function Bar({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="주 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-page pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="flex h-tab-bar-height">
        {MAIN_NAV.map((item) => {
          const active = !!pathname && item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          const Icon = ICON[item.id] ?? Compass;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-caption transition-colors motion-reduce:transition-none",
                  active ? "font-semibold text-text-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileTabBar() {
  return <Bar pathname={usePathname()} />;
}

/** Same bar without the active tab; shown while the pathname is not known yet (Suspense fallback). */
export function MobileTabBarFallback() {
  return <Bar pathname={null} />;
}
