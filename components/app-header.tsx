import Link from "next/link";
import { Suspense } from "react";
import { MainNav, MainNavFallback } from "@/components/main-nav";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { HeaderSearch } from "@/components/search/header-search";

function Logo() {
  return (
    <Link href="/explore" className="flex items-center gap-2 text-heading-3">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2.6" />
        <circle cx="12" cy="12" r="3.2" fill="currentColor" />
        <circle cx="19" cy="8" r="2" fill="currentColor" />
      </svg>
      LetsGraph
    </Link>
  );
}

/** Shown instead of the login buttons while Supabase keys are not set (demo data only). */
function DemoModeNotice() {
  return (
    <span className="inline-flex h-8 items-center rounded-element border border-dashed border-border-emphasized px-3 text-caption text-text-secondary" title="Supabase 키를 넣으면 로그인과 내 데이터 저장이 켜져요.">
      데모 모드 · 로그인 준비 중
    </span>
  );
}

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
