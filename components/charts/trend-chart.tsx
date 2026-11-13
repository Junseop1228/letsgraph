"use client";
// 기간별 추이 + 기간 슬라이더 PeriodScrubber (DESIGN.md Components). Revenue and operating income as two small lines.
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import type { FinancialPoint } from "@/lib/contracts/domain";
import { formatEok, formatEokShort, percentChange } from "@/lib/format";
import { Delta } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function TrendChart({ points, title = "매출·영업이익 추이" }: { points: FinancialPoint[]; title?: string }) {
  const [sel, setSel] = useState(points.length - 1);
  const p = points[sel];
  const prev = points[sel - 1];
  const revChg = p.revenueChangeReported ?? percentChange(prev?.revenue, p.revenue);
  const opChg = p.operatingIncomeChangeReported ?? percentChange(prev?.operatingIncome, p.operatingIncome);
  const data = points.map((x) => ({ y: String(x.year), rev: x.revenue, op: x.operatingIncome }));
  const year = String(p.year);

  return (
    <div className="space-y-3">
      <p className="text-caption text-text-secondary">{title}</p>
      <p className="figures text-figure-hero">{formatEok(p.revenue)}</p>
      <p className="flex flex-wrap gap-x-3 text-caption text-text-secondary">
        <span>{p.year} 매출 <Delta pct={revChg} /></span>
        <span>영업이익 <span className="figures text-text-primary">{formatEok(p.operatingIncome)}</span> <Delta pct={opChg} /></span>
      </p>
      {[
        { key: "rev" as const, label: "매출", dash: undefined, color: "var(--color-data-1)" },
        { key: "op" as const, label: "영업이익", dash: "5 4", color: "var(--color-data-2)" },
      ].map((s) => (
        <div key={s.key}>
          <p className="text-caption text-text-secondary">{s.label}</p>
          <div className="h-[96px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
                <XAxis dataKey="y" hide />
                <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
                <ReferenceLine x={year} stroke="var(--color-border-emphasized)" strokeDasharray="2 3" />
                <Tooltip
                  cursor={false}
                  formatter={(v) => [formatEokShort(Number(v)), s.label]}
                  contentStyle={{ background: "var(--color-bg-inverted)", color: "var(--color-text-inverted)", border: 0, borderRadius: 4, fontSize: 12 }}
                  labelStyle={{ color: "var(--color-text-inverted-secondary)" }}
                />
                <Line
                  type="linear"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={1.5}
                  strokeDasharray={s.dash}
                  isAnimationActive={false}
                  dot={(d: { cx?: number; cy?: number; index?: number }) => (
                    <rect key={d.index} x={(d.cx ?? 0) - 4} y={(d.cy ?? 0) - 4} width={8} height={8} fill={d.index === sel ? "var(--color-data-1)" : "var(--color-bg-surface)"} stroke="var(--color-data-1)" />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
      <div role="group" aria-label="회계 연도" className="flex gap-0.5 rounded-[7px] bg-bg-tonal p-[3px]">
        {points.map((x, i) => (
          <button
            key={x.year}
            type="button"
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
            className={cn("figures h-8 flex-1 rounded-element text-label", i === sel ? "bg-bg-selected font-semibold" : "text-text-secondary hover:bg-overlay-hover")}
          >
            FY{x.year}
          </button>
        ))}
      </div>
    </div>
  );
}
