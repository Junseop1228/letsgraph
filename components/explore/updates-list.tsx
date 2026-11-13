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
            <span className="h-[22px] rounded-inner bg-bg-tonal px-2 text-data-sm leading-[22px] text-text-secondary">{u.tag}</span>
            <span>
              <span className="block text-label-strong">{u.title}</span>
              <span className="figures block text-caption text-text-secondary">{u.date.replaceAll("-", ".")} · {u.sourceLabel}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-secondary">기사 본문은 싣지 않아요. 뉴스는 검색 결과로 연결해요.</p>
    </div>
  );
}
