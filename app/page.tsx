// 첫 화면 (D 2026-11-18 landing option 나): a visitor who has not finished the job cards sees one screen that says what
// letsGraph does, end to end (직무와 회사 찾기 -> 회사 이해 -> 내 경험 정리 -> 자소서 프롬프트 키트), with a live example
// graph and one button into the cards (/explore). Visitors who finished or skipped the cards never see it: proxy.ts sends
// "/" straight to their graph (specs/explore FR-DISC-01).
import Image from "next/image";
import Link from "next/link";
import { LandingGraph } from "@/components/landing/landing-graph";
import { ThemeToggle } from "@/components/header/theme-toggle";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";
import "@/styles/landing.css";

// the four things the service does, in the order a student meets them (a real sequence, so it is numbered)
const STEPS = [
  { title: "직무와 회사 찾기", text: "카드 몇 장으로 관심 직무를 고르면, 그 직무를 뽑는 산업과 기업이 그래프로 펼쳐져요." },
  { title: "회사 이해하기", text: "기업마다 어느 사업부가 얼마를 버는지, 최근에 어떤 소식이 있었는지 한눈에 봐요." },
  { title: "내 경험 정리하기", text: "AI 코치와 대화하며 동아리, 아르바이트, 공모전 같은 활동을 에피소드 카드로 모아 둬요." },
  { title: "자소서 프롬프트 키트 받기", text: "공고를 올리면 조건마다 맞는 내 경험을 골라, 자소서 쓰는 데 바로 쓰는 프롬프트 키트로 묶어 드려요." },
];

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
      <main className="mx-auto grid w-full max-w-content-max flex-1 content-center items-center gap-10 px-5 pb-12 pt-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:pb-16">
        <section className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-display-mobile break-keep text-balance md:text-display">직무를 고르면 갈 회사가 보이고, 내 경험은 자소서 재료가 돼요</h1>
            <p className="max-w-reading-max text-body-lg break-keep text-pretty text-text-secondary">
              탐색에서 끝나지 않아요. 회사를 이해하고, 내 경험을 모으고, 자소서에 바로 쓸 프롬프트 키트까지 한 곳에서 이어져요.
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/explore" className={cn(btn.primary, "h-control-lg px-6")}>
              직무 고르러 가기
            </Link>
            <p className="text-caption break-keep text-text-secondary">직무 탐색은 로그인 없이 바로 써요.</p>
          </div>
          <ol className="max-w-reading-max space-y-3 border-t border-border pt-5">
            {STEPS.map((s, k) => (
              <li key={s.title} className="flex gap-3">
                <span className="figures w-4 shrink-0 text-label-strong text-text-secondary">{k + 1}</span>
                <div>
                  <p className="text-label-strong">{s.title}</p>
                  <p className="text-support break-keep text-text-secondary">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <LandingGraph />
      </main>
    </div>
  );
}
