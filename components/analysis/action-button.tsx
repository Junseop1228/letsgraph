"use client";
import { useActionState } from "react";
import type { ActionState } from "@/app/(main)/analysis/actions";
import { btn } from "@/components/lg/ui";

/** Runs a server action bound to its arguments and shows the result line. */
export function ActionButton({ action, label, pendingLabel }: { action: (prev: ActionState) => Promise<ActionState>; label: string; pendingLabel: string }) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className={btn.primary}>{pending ? pendingLabel : label}</button>
      {state?.error && <p role="alert" className="text-label text-text-error">{state.error}</p>}
      {state?.ok && <p role="status" className="text-label text-text-success">{state.ok}</p>}
    </form>
  );
}
