import Link from "next/link";
import { Suspense } from "react";
import { MainNav, MainNavFallback } from "@/components/main-nav";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";

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

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-page">
      <div className="mx-auto flex h-header-height max-w-content-max items-center gap-6 px-5">
        <Logo />
        <Suspense fallback={<MainNavFallback />}>
          <MainNav />
        </Suspense>
        <div className="flex-1" />
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <Suspense>
            <AuthButton />
          </Suspense>
        )}
      </div>
    </header>
  );
}
