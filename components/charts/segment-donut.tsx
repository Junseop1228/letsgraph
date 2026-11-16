"use client";
// 회사 안 비중 도넛: focus segment = data-1 (ink), other disclosed segments = data-2, calculated remainder = data-3.
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { BusinessSegment } from "@/lib/contracts/domain";
import { formatEok, share } from "@/lib/format";

export function SegmentDonut({ segments, focusId }: { segments: BusinessSegment[]; focusId?: string }) {
  const rows = segments.filter((s) => (s.revenue ?? 0) > 0);
  const total = rows.reduce((t, s) => t + (s.revenue ?? 0), 0);
  const focus = rows.find((s) => s.id === focusId) ?? rows[0];
  const color = (s: BusinessSegment) => (s.id === focus?.id ? "var(--color-data-1)" : s.calculated ? "var(--color-data-3)" : "var(--color-data-2)");
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]">
      <div className="relative h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="revenue" nameKey="name" innerRadius={56} outerRadius={84} startAngle={90} endAngle={-270} stroke="var(--color-bg-surface)" strokeWidth={2} isAnimationActive={false}>
              {rows.map((s) => (
                <Cell key={s.id} fill={color(s)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {focus && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="figures text-figure">{share(focus.revenue ?? 0, total)}%</span>
            <span className="text-caption text-text-secondary">{focus.shortName}</span>
          </div>
        )}
      </div>
      <ul className="space-y-2">
        {rows.map((s) => (
          <li key={s.id} className="grid grid-cols-[12px_1fr_auto] items-center gap-3 text-label">
            <i className="size-3 rounded-inner" style={{ background: color(s) }} />
            <span className={s.id === focus?.id ? "font-semibold" : undefined}>{s.name}{s.calculated ? " (계산)" : ""}</span>
            <span className="figures text-data">{formatEok(s.revenue)} · {share(s.revenue ?? 0, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
