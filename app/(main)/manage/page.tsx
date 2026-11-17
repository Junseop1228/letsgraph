import { LoginPrompt } from "@/components/lg/login-prompt";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronUp, Layers, MessageSquare, Plus } from "lucide-react";
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

/** 활동 카드 만들기 (PORT-03, PORT-06): a dashed "add" tile on top of the board, open while there are no activities. PDF and GitHub on the left, chat on the right. */
function CreateActivity({ open }: { open: boolean }) {
  return (
    <details open={open} className="group mt-6 rounded-container open:bg-bg-sunken">
      {/* closed: a dashed "add" tile, like the "첫 에피소드 꺼내기" card at the end of a row; open: a header with 닫기 */}
      <summary
        className={cn(
          "flex cursor-pointer list-none flex-col items-center gap-1 rounded-container border border-dashed border-border-emphasized px-5 py-6 text-center transition-colors motion-reduce:transition-none",
          "hover:border-border-strong hover:bg-overlay-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "group-open:flex-row group-open:justify-between group-open:border-transparent group-open:py-3 group-open:text-left group-open:hover:bg-transparent",
        )}
      >
        <span className="flex items-center gap-2 text-heading-3">
          <Plus className="size-5 group-open:hidden" aria-hidden />
          새 활동 카드 만들기
        </span>
        <span className="text-support text-text-secondary group-open:hidden">PDF, GitHub 저장소, AI와 대화 중에 골라요</span>
        <span className="hidden items-center gap-1 rounded-element px-2 py-1 text-label text-text-secondary hover:bg-overlay-hover group-open:flex">
          닫기
          <ChevronUp className="size-4" aria-hidden />
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
  const { repo, demo, guest } = await userData();
  if (guest) return <LoginPrompt next="/manage" title="로그인하면 경험 카드를 만들 수 있어요" text="AI 코치와 대화하며 활동과 에피소드를 꺼내고 카드로 모아요. 무료로 활동과 에피소드를 각각 3개까지 저장할 수 있어요." />;
  const [activities, episodes] = await Promise.all([repo.activities(), repo.experiences()]);
  return (
    <div className="mx-auto max-w-content-max px-5 py-6">
      {/* title and tabs share one row, so the chat window is in view without scrolling */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-heading-1">관리</h1>
          {demo && <DemoBadge />}
        </div>
      <nav aria-label="관리 메뉴" className="flex gap-2">
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
      </div>
      {tab === "cards" ? <p className="mt-2 text-body text-text-secondary">활동을 정하고 AI와 대화해 에피소드를 꺼내요. 카드로 모아 두면 공고와 이어 볼 수 있어요.</p> : null}
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
