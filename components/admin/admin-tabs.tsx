// 관리자 탭 (specs/data-pipeline FR-OPS-04, specs/safety SAFE-03): the admin pages side by side.
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/company-jobs", label: "회사 직무" },
  { href: "/admin/evidence", label: "공고 근거" },
] as const;

export function AdminTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="관리자 메뉴" className="flex gap-2">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn(
            "flex h-control-md items-center rounded-element border px-4 text-label-strong",
            t.href === current ? "border-bg-selected bg-bg-selected" : "border-border-emphasized text-text-secondary hover:bg-overlay-hover",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
