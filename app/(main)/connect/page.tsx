import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { userData } from "@/lib/data";
import { DemoBadge, EmptyState, btn } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";

export const metadata = { title: "연결 · letsGraph" };

// 연결 탭 (teammate spec 4): pick a posting, then 매칭 화면 -> 키트.
async function ConnectContent() {
  const { repo, demo } = await userData();
  const postings = await repo.postings();
  const rows = await Promise.all(
    postings.map(async (p) => ({ p, analysis: await repo.postingAnalysis(p.id), connection: await repo.connection(p.id) })),
  );
  const ready = rows.filter((r) => r.analysis);
  return (
    <div className="mx-auto max-w-reading-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-1">연결</h1>
          <p className="mt-1 text-body-lg text-text-secondary">공고의 요구 역량과 내 경험 카드를 잇고, 자기소개서 코칭용 Prompt Kit을 받아요.</p>
        </div>
        {demo && <DemoBadge />}
      </div>
      {ready.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="정리된 공고가 없어요" body="공고 탭에서 공고를 먼저 정리하면 여기서 내 경험과 이어 볼 수 있어요." action={<Link href="/postings" className={btn.secondary}>공고로 가기</Link>} />
        </div>
      ) : (
        <ul className="mt-6">
          {ready.map(({ p, analysis, connection }) => (
            <li key={p.id}>
              <Link href={`/connect/${p.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-1 py-4 hover:bg-overlay-hover">
                <span>
                  <span className="block text-label-strong">{p.companyName} · {p.title}</span>
                  <span className="block text-caption text-text-secondary">
                    요구 역량 {analysis!.competencies.length}개 · {connection ? `연결 ${connection.links.length}곳, 빈 역량 ${connection.gaps.length}개` : "아직 연결 전"}
                    {p.source === "demo" ? " · 데모용 예시 공고" : ""}
                  </span>
                </span>
                <ArrowRight className="size-4 text-text-secondary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConnectContent />
    </Suspense>
  );
}
