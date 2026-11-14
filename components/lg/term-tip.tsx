"use client";
// 용어 팁 (specs/company FR-CORP-03): a small "?" next to a term; click, tap or focus shows a one-line explanation.
import { useEffect, useId, useRef, useState } from "react";
import { TERMS } from "@/lib/terms";

export function TermTip({ term }: { term: string }) {
  const text = TERMS[term];
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);
  if (!text) return null;
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`${term} 뜻`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-5 items-center justify-center rounded-full border border-border-emphasized text-data-sm leading-none text-text-secondary hover:bg-overlay-hover"
      >
        ?
      </button>
      {open && (
        <span role="tooltip" id={id} className="absolute left-0 top-6 z-30 w-64 rounded-element bg-bg-inverted p-3 text-caption text-text-inverted shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <span className="block text-label-strong">{term}</span>
          {text}
        </span>
      )}
    </span>
  );
}
