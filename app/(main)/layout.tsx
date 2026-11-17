import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { MobileTabBar, MobileTabBarFallback } from "@/components/mobile-tab-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      {/* below sm the bottom tab bar covers the last tab-bar-height of the screen: keep content clear of it */}
      <main className="flex-1 pb-tab-bar-height sm:pb-0">{children}</main>
      <Suspense fallback={<MobileTabBarFallback />}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}
