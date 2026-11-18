// 첫 화면 (D 2026-11-18 landing option 나): a visitor who has not finished the job cards sees one screen that says what
// letsGraph does, with an example graph, and one button into the cards (/explore). Visitors who finished or skipped
// the cards never see it: proxy.ts sends "/" straight to their graph (specs/explore FR-DISC-01).
import Image from "next/image";
import Link from "next/link";
import { LandingGraph } from "@/components/landing/landing-graph";
import { ThemeToggle } from "@/components/header/theme-toggle";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";
import "@/styles/landing.css";

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <header className="mx-auto flex h-header-height w-full max-w-content-max items-center justify-between gap-3 px-5">
        <Link href="/" aria-label="letsGraph" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-heading-3">
          <Image src="/brand/logo-mark.png" alt="" width={32} height={32} priority className="size-8 dark:hidden" />
          <Image src="/brand/logo-mark-dark.png" alt="" width={32} height={32} priority className="hidden size-8 dark:block" />
          letsGraph
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/auth/login" className={btn.ghost}>
            로그인
          </Link>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-content-max flex-1 content-center items-center gap-10 px-5 pb-12 pt-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:pb-20">
        <section className="space-y-5">
          <h1 className="text-display-mobile break-keep text-balance md:text-display">직무를 고르면, 회사가 돈 버는 길이 보여요</h1>
          <p className="max-w-reading-max text-body-lg break-keep text-pretty text-text-secondary">
            관심 직무를 고르면 그 직무를 뽑는 산업과 기업을 그래프 한 장으로 이어 드려요. 기업마다 어느 사업부가 얼마를 버는지, 최근에 어떤
            공시를 냈는지도 함께 볼 수 있어요.
          </p>
          <div className="space-y-3 pt-1">
            <Link href="/explore" className={cn(btn.primary, "h-control-lg px-6")}>
              직무 고르러 가기
            </Link>
            <p className="text-caption break-keep text-text-secondary">로그인 없이 바로 써요. 기업 정보는 금융감독원 전자공시(DART) 자료로 만들어요.</p>
          </div>
        </section>
        <LandingGraph />
      </main>
    </div>
  );
}
