"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1">
      {MAIN_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "h-9 rounded-element px-3.5 inline-flex items-center text-label-strong transition-colors",
              active
                ? "bg-bg-selected text-text-primary"
                : "text-text-secondary hover:bg-overlay-hover hover:text-text-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
