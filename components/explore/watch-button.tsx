"use client";
import { Heart } from "lucide-react";
import { useWatched } from "@/lib/client/local-state";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

/** 관심 저장 (specs/explore FR-DISC-03). Demo mode keeps it in the browser. */
export function WatchButton({ companyId, initial }: { companyId: string; initial: string[] }) {
  const w = useWatched(initial);
  const on = w.has(companyId);
  return (
    <button type="button" aria-pressed={on} onClick={() => w.toggle(companyId)} className={btn.secondary}>
      <Heart className={cn("size-4", on && "fill-current")} aria-hidden />
      {on ? "관심 저장됨" : "관심 저장"}
    </button>
  );
}
