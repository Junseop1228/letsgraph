// 활동 타일 (specs/portfolio PORT-03): the ink node an activity's episodes hang from, like the job node on the job map.
import { EXPERIENCE_KIND_LABEL, type Activity } from "@/lib/contracts/activity";
import { cn } from "@/lib/utils";

type Props = { activity: Activity; episodeCount?: number; className?: string };

export function ActivityTile({ activity: a, episodeCount, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-container bg-bg-inverted p-4 text-text-inverted", className)}>
      <p className="text-support text-text-inverted-secondary">
        {EXPERIENCE_KIND_LABEL[a.kind]}
        {a.period ? <span className="figures"> {a.period}</span> : null}
      </p>
      <p className="text-heading-3 break-keep">{a.title}</p>
      {a.role ? <p className="text-support text-text-inverted-secondary line-clamp-2">{a.role}</p> : null}
      {episodeCount != null ? (
        <p className="mt-auto pt-2 text-label">
          에피소드 <span className="figures">{episodeCount}</span>개
        </p>
      ) : null}
    </div>
  );
}
