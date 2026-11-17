import { ExternalLink } from "lucide-react";
import type { CompanyUpdate } from "@/lib/contracts/domain";
import { Kicker, btn } from "@/components/lg/ui";

// Recent updates (specs/company FR-CORP-02): disclosures and IR only; news is an outbound search link (NFR-EXT-01).
export function UpdatesList({ updates, newsQuery }: { updates: CompanyUpdate[]; newsQuery: string }) {
  return (
    <div className="space-y-3">
      <Kicker
        right={
          <a className={`${btn.secondary} ${btn.sm}`} href={`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(newsQuery)}`} target="_blank" rel="noreferrer">
            뉴스 검색 <ExternalLink className="size-3.5" aria-hidden />
          </a>
        }
      >
        최근 소식
      </Kicker>
      <ul>
        {updates.map((u, i) => (
          <li key={i} className="grid grid-cols-[auto_1fr] gap-3 border-b border-border py-3">
            {/* segment short names can be 6 letters (B3 tags): the chip grows instead of clipping */}
            <span className="h-5.5 min-w-12 whitespace-nowrap rounded-inner bg-bg-tonal px-2 text-center text-data-sm leading-5.5 text-text-secondary">{u.tag}</span>
            <span>
              {u.url ? (
                <a href={u.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-label-strong hover:underline">
                  {u.title}
                  <ExternalLink className="mt-1 size-3.5 shrink-0 text-text-secondary" aria-hidden />
                  <span className="sr-only">(DART에서 원문 보기, 새 창)</span>
                </a>
              ) : (
                <span className="block text-label-strong">{u.title}</span>
              )}
              <span className="figures block text-caption text-text-secondary">{u.date.replaceAll("-", ".")} · {u.sourceLabel}</span>
            </span>
          </li>
        ))}
      </ul>
      {updates.length === 0 && <p className="py-3 text-body text-text-secondary">최근 4개월 동안 사업과 관련된 공시가 없어요.</p>}
      <p className="text-caption text-text-secondary">기사 본문은 싣지 않아요. 공시는 DART 원문으로, 뉴스는 검색 결과로 연결해요.</p>
    </div>
  );
}
