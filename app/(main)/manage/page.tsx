import Link from "next/link";
import { Suspense } from "react";
import { ChevronDown, Layers, MessageSquare } from "lucide-react";
import { userData } from "@/lib/data";
import { btn, DemoBadge } from "@/components/lg/ui";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { PdfUpload } from "@/components/analysis/pdf-upload";
import { ExperienceChat } from "@/components/manage/experience-chat";
import { ActivityBoard } from "@/components/manage/activity-board";
import { importActivitiesAction } from "@/app/(main)/manage/chat-actions";
import { RepoImport } from "@/components/manage/repo-import";
import { cn } from "@/lib/utils";

export const metadata = { title: "관리 · letsGraph" };

// 관리 탭 (teammate spec 3-0, whiteboard 2026-11-16): 만들기 (AI 채팅: 활동 -> 에피소드) and 카드 (활동별 에피소드 보드).
const TABS = [
  { id: "chat", label: "만들기", icon: MessageSquare },
  { id: "cards", label: "카드", icon: Layers },
] as const;
type Tab = (typeof TABS)[number]["id"];
type SP = { tab?: string; ep?: string; act?: string; activity?: string; log?: string };

/** 활동 카드 만들기 (PORT-03, PORT-06): on top of the board, folded once there are activities. PDF and GitHub on the left, chat on the right. */
function CreateActivity({ open }: { open: boolean }) {
  return (
    <details open={open} className="group mt-6 rounded-container bg-bg-sunken">
      <summary className="flex min-h-row-height cursor-pointer list-none items-center justify-between gap-3 rounded-container px-5 py-3 hover:bg-overlay-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-heading-3">활동 카드 만들기</span>
          <span className="text-support text-text-secondary">PDF나 GitHub 저장소로, 또는 AI와 대화로 만들어요</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-label text-text-secondary">
          <span className="group-open:hidden">펼치기</span>
          <span className="hidden group-open:inline">접기</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </span>
      </summary>
      <div className="grid gap-4 border-t border-border px-5 py-5 md:grid-cols-5">
        <div className="space-y-5 md:col-span-3">
          <section className="space-y-2" aria-labelledby="create-pdf">
            <h2 id="create-pdf" className="text-label-strong">PDF로 만들기</h2>
            <PdfUpload
              action={importActivitiesAction}
              label="포트폴리오·자기소개서 PDF"
              hint="PDF 속 활동마다 활동 카드를 만들어요. 에피소드는 만들기에서 AI와 꺼내요. 10MB까지."
              submit="활동 카드 만들기"
            />
          </section>
          <section className="space-y-2 border-t border-border pt-5" aria-labelledby="create-repo">
            <h2 id="create-repo" className="text-label-strong">GitHub 주소로 만들기</h2>
            <RepoImport />
          </section>
        </div>
        <section className="flex flex-col gap-3 rounded-container border border-border bg-bg-surface p-4 md:col-span-2" aria-labelledby="create-chat">
          <h2 id="create-chat" className="text-label-strong">대화로 만들기</h2>
          <p className="text-body text-text-secondary">파일이 없어도 돼요. AI 코치가 무슨 활동이었는지, 맡은 역할과 사용한 데이터를 하나씩 물어요.</p>
          <Link href="/manage?tab=chat" className={cn(btn.secondary, "mt-auto self-start")}>
            AI와 대화로 만들기
          </Link>
        </section>
      </div>
    </details>
  );
}

async function ManageContent({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === "cards" ? "cards" : "chat";
  const { repo, demo } = await userData();
  const [activities, episodes] = await Promise.all([repo.activities(), repo.experiences()]);
  return (
    <div className="mx-auto max-w-content-max px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-1">관리</h1>
          <p className="mt-1 text-body-lg text-text-secondary">활동을 정하고 AI와 대화해 에피소드를 꺼내요. 카드로 모아 두면 공고와 이어 볼 수 있어요.</p>
        </div>
        {demo && <DemoBadge />}
      </div>
      <nav aria-label="관리 메뉴" className="mt-6 flex justify-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/manage?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "flex h-control-md items-center gap-2 rounded-element border px-4 text-label-strong",
              t.id === tab ? "border-bg-selected bg-bg-selected" : "border-border-emphasized text-text-secondary hover:bg-overlay-hover",
            )}
          >
            <t.icon className="size-4" aria-hidden />
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "chat" ? (
        <ExperienceChat key={`${sp.activity ?? "new"}-${sp.log ?? ""}`} activities={activities} episodes={episodes} initialActivityId={sp.activity} initialLogId={sp.log} />
      ) : (
        <>
          <CreateActivity open={activities.length === 0} />
          <ActivityBoard activities={activities} episodes={episodes} initialEpisodeId={sp.ep} initialActivityId={sp.act} />
        </>
      )}
    </div>
  );
}

export default function ManagePage(props: { searchParams: Promise<SP> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManageContent {...props} />
    </Suspense>
  );
}
