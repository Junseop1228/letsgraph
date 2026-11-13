"use client";
import { useActionState } from "react";
import { CONSENT_ITEMS } from "@/lib/contracts/account";
import { saveConsentAction } from "@/app/auth/consent/actions";
import { btn } from "@/components/lg/ui";

export function ConsentForm({ next }: { next: string }) {
  const [state, run, pending] = useActionState(saveConsentAction, undefined);
  return (
    <form action={run} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <ul className="space-y-2">
        {CONSENT_ITEMS.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer gap-3 rounded-element border border-border-emphasized p-4 hover:bg-overlay-hover has-[:checked]:border-bg-selected has-[:checked]:bg-bg-selected">
              <input type="checkbox" name={c.id} required className="mt-1 size-4 accent-[var(--color-accent)]" />
              <span>
                <span className="block text-label-strong">[필수] {c.label}</span>
                <span className="block text-caption text-text-secondary">{c.detail}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {state?.error && <p role="alert" className="text-label text-text-error">{state.error}</p>}
      <button type="submit" disabled={pending} className={btn.primary}>{pending ? "저장하는 중…" : "동의하고 시작하기"}</button>
    </form>
  );
}
