import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { UserRound } from "lucide-react";
import { MainNav, MainNavFallback } from "@/components/main-nav";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { HeaderSearch } from "@/components/search/header-search";
import { HeaderNotifications } from "@/components/header/header-notifications";

function Logo() {
  return (
    <Link href="/explore" className="flex items-center gap-2 text-heading-3">
      {/* Final logo (team decision 2026-11-16). Dark variant swaps the black strokes for light ones. */}
      <Image src="/brand/logo-mark.png" alt="" width={32} height={32} priority className="size-8 dark:hidden" />
      <Image src="/brand/logo-mark-dark.png" alt="" width={32} height={32} priority className="hidden size-8 dark:block" />
      letsGraph
    </Link>
  );
}

/** Shown instead of the login buttons while Supabase keys are not set (demo data only). */
function DemoModeNotice() {
  return (
    <span className="hidden h-8 items-center rounded-element border border-dashed border-border-emphasized px-3 text-caption text-text-secondary lg:inline-flex" title="Supabase 키를 넣으면 로그인과 내 데이터 저장이 켜져요.">
      데모 모드
    </span>
  );
}

// Header per the teammate spec: logo, 4 tabs, search, notification bell, profile.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-page">
      <div className="mx-auto flex h-header-height max-w-content-max items-center gap-6 px-5">
        <Logo />
        <Suspense fallback={<MainNavFallback />}>
          <MainNav />
        </Suspense>
        <div className="flex-1" />
        <Suspense>
          <HeaderSearch />
        </Suspense>
        <div className="flex items-center gap-1">
          <Suspense>
            <HeaderNotifications />
          </Suspense>
          <Link href="/account" aria-label="내 계정" className="flex size-10 items-center justify-center rounded-element hover:bg-overlay-hover">
            <UserRound className="size-5" aria-hidden />
          </Link>
        </div>
        {!hasEnvVars ? (
          <DemoModeNotice />
        ) : (
          <Suspense>
            <AuthButton />
          </Suspense>
        )}
      </div>
    </header>
  );
}
