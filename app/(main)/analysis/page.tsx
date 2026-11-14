import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { userData } from "@/lib/data";
import { DemoBadge, Kicker } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { PdfUpload } from "@/components/analysis/pdf-upload";
import { PostingsTable } from "@/components/analysis/postings-table";
import { analyzePostingAction } from "./actions";

export const metadata = { title: "분석 · LetsGraph" };

async function AnalysisContent() {
  await connection(); // request-time render: uses today's date and the user's data
  const { repo, demo } = await userData();
  const postings = await repo.postings();
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-heading-1">분석</h1>
          <p className="mt-1 text-body-lg text-text-secondary">공고를 정리하고, 내 경험이 공고의 요구 역량과 어떻게 이어지는지 확인해요.</p>
        </div>
        {demo && <DemoBadge />}
      </div>

      <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="space-y-4 bg-bg-page py-6 lg:pr-6">
          <Kicker>공고 올리기</Kicker>
          <PdfUpload action={analyzePostingAction} label="채용공고 PDF" hint="공고 페이지를 PDF로 저장해서 올려요. 10MB까지." submit="공고 정리하기" />
          <p className="text-caption text-text-secondary">채용 사이트를 자동으로 긁어 오지 않아요. 공고 하나를 정리할 때 쿼터 1회를 써요.</p>
        </section>

        <section className="space-y-3 bg-bg-page py-6 lg:pl-6">
          <Kicker right={<span className="figures text-caption text-text-secondary">{postings.length}건</span>}>내 공고</Kicker>
          <PostingsTable postings={postings} />
          <Link href="/manage?tab=calendar" className="inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary">
            마감 달력으로 보기 <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnalysisContent />
    </Suspense>
  );
}
