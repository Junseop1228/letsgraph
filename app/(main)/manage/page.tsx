import Link from "next/link";
import { Suspense } from "react";
import { MessageSquare, Layers } from "lucide-react";
import { userData } from "@/lib/data";
import { EXPERIENCE_KIND_LABEL, type Experience } from "@/lib/contracts/activity";
import { DemoBadge, Kicker } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { PdfUpload } from "@/components/analysis/pdf-upload";
import { ExperienceChat } from "@/components/manage/experience-chat";
import { extractExperiencesAction } from "@/app/(main)/postings/actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "관리 · LetsGraph" };

// 관리 탭 (teammate spec 3-0): two toggles, AI 채팅 and 카드 보기.
const TABS = [
  { id: "chat", label: "AI와 경험 정리하기", icon: MessageSquare },
  { id: "cards", label: "내 카드 보기", icon: Layers },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Cards({ experiences }: { experiences: Experience[] }) {
  const groups = new Map<string, Experience[]>();
  for (const e of experiences) groups.set(e.sourceLabel ?? "직접 입력", [...(groups.get(e.sourceLabel ?? "직접 입력") ?? []), e]);
  return (
    <div className="space-y-6 py-6">
      <PdfUpload action={extractExperiencesAction} label="포트폴리오·자기소개서 PDF" hint="파일 속 경험을 카드로 나눠 정리해요. 10MB까지." submit="경험 카드 만들기" />
      {[...groups.entries()].map(([label, list]) => (
        <section key={label} className="space-y-3">
          <Kicker right={<span className="figures text-caption text-text-secondary">에피소드 {list.length}</span>}>{label}</Kicker>
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((e) => (
              <li key={e.id} className="space-y-2 rounded-container border border-border p-4">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-heading-3">{e.title}</span>
                  <span className="h-[22px] rounded-inner bg-bg-tonal px-2 text-data-sm leading-[22px] text-text-secondary">{EXPERIENCE_KIND_LABEL[e.kind]}</span>
                </p>
                {e.period && <p className="figures text-caption text-text-secondary">{e.period}</p>}
                <dl className="space-y-1 text-body">
                  {[["상황", e.situation], ["행동", e.action], ["결과", e.result]].map(([k, v]) => v ? (
                    <div key={k} className="grid grid-cols-[40px_1fr] gap-2"><dt className="text-label text-text-secondary">{k}</dt><dd>{v}</dd></div>
                  ) : null)}
                </dl>
                <div className="flex flex-wrap gap-1.5">
                  {e.competencies.map((c) => <span key={c} className="h-[22px] rounded-inner bg-bg-tonal px-2 text-data-sm leading-[22px]">{c}</span>)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function ManageContent({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "cards" ? "cards" : "chat";
  const { repo, demo } = await userData();
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-1">관리</h1>
          <p className="mt-1 text-body-lg text-text-secondary">경험을 대화로 정리하고, 카드로 모아 두면 공고와 이어 볼 수 있어요.</p>
        </div>
        {demo && <DemoBadge />}
      </div>
      <nav aria-label="관리 메뉴" className="mt-6 flex justify-center gap-2">
        {TABS.map((t) => (
          <Link key={t.id} href={`/manage?tab=${t.id}`} aria-current={t.id === tab ? "page" : undefined} className={cn("flex h-control-md items-center gap-2 rounded-element border px-4 text-label-strong", t.id === tab ? "border-bg-selected bg-bg-selected" : "border-border-emphasized text-text-secondary hover:bg-overlay-hover")}>
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "chat" ? <ExperienceChat /> : <Cards experiences={await repo.experiences()} />}
    </div>
  );
}

export default function ManagePage(props: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageContent {...props} />
    </Suspense>
  );
}
