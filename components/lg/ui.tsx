// Small shared building blocks used across screens. All styling via DESIGN.md tokens.
import Link from "next/link";
import type { Provenance } from "@/lib/contracts/domain";
import { formatChange } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 근거 라벨 TrustLabel (CMP-3): filing/IR = ink, AI/estimate = violet + dashed edge */
export function TrustLabel({ p, className }: { p: Pick<Provenance, "kind"> & { text?: string }; className?: string }) {
  const ai = p.kind === "ai" || p.kind === "estimate";
  const text =
    p.text ?? { filing: "공시 근거", ir: "IR 근거", calculated: "계산", estimate: "추정", ai: "AI 요약" }[p.kind];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center whitespace-nowrap rounded-inner px-2 text-data-sm figures",
        ai ? "border border-dashed border-border-ai bg-ai-muted text-text-ai" : "bg-bg-inverted text-text-inverted",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Source line under a figure: label + 기준 시점 (NFR-PROD-06) */
export function SourceLine({ p }: { p: Provenance }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
      <TrustLabel p={p} />
      <span>
        {p.label}
        {p.date ? ` (${p.date.replaceAll("-", ".")})` : ""}
      </span>
    </p>
  );
}

export function Kicker({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-label text-text-secondary">
        <span aria-hidden className="size-1.5 rounded-[1px] bg-text-primary" />
        {children}
      </h2>
      {right}
    </div>
  );
}

/** ▲/▼ with sign and colour (COL-5, COL-6) */
export function Delta({ pct, label }: { pct: number | null | undefined; label?: string }) {
  if (pct == null) return null;
  return (
    <span className={cn("figures text-data", pct >= 0 ? "text-text-up" : "text-text-down")}>
      {formatChange(pct)}
      {label ? <span className="ml-1 text-text-secondary">{label}</span> : null}
    </span>
  );
}

export function DemoBadge({ children = "데모 데이터" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex h-[22px] items-center rounded-inner border border-dashed border-border-emphasized px-2 text-data-sm text-text-secondary">
      {children}
    </span>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="경로" className="flex flex-wrap items-center gap-1 text-caption text-text-secondary">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {it.href ? (
            <Link href={it.href} className="rounded-inner px-1 hover:bg-overlay-hover hover:text-text-primary">
              {it.label}
            </Link>
          ) : (
            <span className="text-text-primary">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-element font-semibold transition-colors disabled:pointer-events-none disabled:text-text-disabled";
export const btn = {
  primary: cn(btnBase, "h-control-md px-4 text-label-strong bg-accent text-on-accent hover:bg-accent-hover"),
  secondary: cn(btnBase, "h-control-md px-4 text-label-strong bg-bg-tonal text-text-primary hover:bg-bg-tonal-hover"),
  outline: cn(btnBase, "h-control-md px-4 text-label-strong border border-border-emphasized bg-bg-surface hover:bg-overlay-hover"),
  ghost: cn(btnBase, "h-control-md px-3 text-label-strong text-text-primary hover:bg-bg-tonal"),
  sm: "h-control-sm px-3 text-label",
};

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-container bg-bg-sunken p-6">
      <p className="text-heading-3">{title}</p>
      <p className="mt-1 max-w-reading-max text-body text-text-secondary">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
