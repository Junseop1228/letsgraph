import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarDays, ChevronDown, List } from "lucide-react";
import { userData } from "@/lib/data";
import { DemoBadge, Kicker } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { PdfUpload } from "@/components/analysis/pdf-upload";
import { PostingUrlForm } from "@/components/analysis/posting-url-form";
import { PostingTextForm } from "@/components/analysis/posting-text-form";
import { PostingsTable } from "@/components/analysis/postings-table";
import { DeadlineCalendar } from "@/components/postings/deadline-calendar";
import { analyzePostingAction, analyzePostingTextAction, analyzePostingUrlAction } from "./actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "공고 · letsGraph" };

type Props = { searchParams: Promise<{ view?: string; month?: string }> };

// 공고 탭 (teammate spec 2-1): add a posting on top, deadline calendar as the main view, list view as an option.
async function PostingsContent({ searchParams }: Props) {
  await connection(); // request-time render: uses today's date and the user's data
  const { view, month } = await searchParams;
  const list = view === "list";
  const { repo, demo } = await userData();
  const postings = await repo.postings();
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-1">공고</h1>
          <p className="mt-1 text-body-lg text-text-secondary">공고 주소나 PDF를 넣으면 정리해 드리고, 마감일 순서로 모아 보여드려요.</p>
        </div>
        {demo && <DemoBadge />}
      </div>

      <section className="mt-6 space-y-4 rounded-container bg-bg-sunken p-5">
        <Kicker>공고 추가</Kicker>
        <PostingUrlForm action={analyzePostingUrlAction} />
        {/* one way up front (address); paste and PDF stay one click away (audit P-4) */}
        <details className="group border-t border-border pt-4">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-element text-label text-text-secondary hover:text-text-primary [&::-webkit-details-marker]:hidden">
            주소로 안 읽히면 붙여넣기나 PDF로 추가해요
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-3 space-y-3">
            <PostingTextForm action={analyzePostingTextAction} />
            <PdfUpload action={analyzePostingAction} label="채용공고 PDF" hint="공고 페이지를 PDF로 저장해서 올려요. 10MB까지." submit="공고 정리하기" />
          </div>
        </details>
      </section>

      <div className="mt-6 flex items-center justify-between border-b border-border pb-2">
        <Kicker right={<span className="figures text-caption text-text-secondary">{postings.length}건</span>}>내 공고</Kicker>
        <div role="group" aria-label="보기 방식" className="flex gap-0.5 rounded-element bg-bg-tonal p-0.5">
          <Link href="/postings" aria-current={!list ? "page" : undefined} className={cn("flex h-8 items-center gap-1.5 rounded-element px-3 text-label", !list ? "bg-bg-selected font-semibold" : "text-text-secondary")}>
            <CalendarDays className="size-4" aria-hidden /> 달력
          </Link>
          <Link href="/postings?view=list" aria-current={list ? "page" : undefined} className={cn("flex h-8 items-center gap-1.5 rounded-element px-3 text-label", list ? "bg-bg-selected font-semibold" : "text-text-secondary")}>
            <List className="size-4" aria-hidden /> 목록
          </Link>
        </div>
      </div>
      {list ? <div className="py-4"><PostingsTable postings={postings} /></div> : <DeadlineCalendar postings={postings} month={month} />}
    </div>
  );
}

export default function PostingsPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PostingsContent {...props} />
    </Suspense>
  );
}
