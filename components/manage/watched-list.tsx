"use client";
import Link from "next/link";
import type { Company } from "@/lib/contracts/domain";
import { useWatched } from "@/lib/client/local-state";
import { formatEokShort } from "@/lib/format";
import { EmptyState, btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

/** 관심 기업 목록 (specs/explore FR-DISC-03) */
export function WatchedList({ companies, initial }: { companies: Company[]; initial: string[] }) {
  const w = useWatched(initial);
  const list = w.ids.map((id) => companies.find((c) => c.id === id)).filter((c): c is Company => !!c);
  if (!list.length) {
    return <EmptyState title="관심 기업이 없어요" body="직무 맵이나 기업 상세에서 관심 저장을 누르면 여기에 모여요." action={<Link href="/explore/map" className={btn.secondary}>직무 맵으로</Link>} />;
  }
  return (
    <ul>
      {list.map((c) => (
        <li key={c.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-3">
          <Link href={c.hasDetail ? `/company/${c.id}` : `/explore/map`} className="rounded-inner px-1 hover:bg-overlay-hover">
            <span className="block text-label-strong">{c.name}</span>
            <span className="block text-caption text-text-secondary">{c.basisNote ?? ""}</span>
          </Link>
          <span className="figures text-data">{formatEokShort(c.revenue)}</span>
          <button type="button" onClick={() => w.toggle(c.id)} className={cn(btn.ghost, btn.sm, "text-text-secondary")}>해제</button>
        </li>
      ))}
    </ul>
  );
}
