// Korean number formatting for money and changes (DESIGN.md TYP-6, HG-13).
// Amounts are stored in 억원 (100 million KRW) as integers, the unit DART summaries and IR decks use.

/** 177549 -> "17조 7,549억", 5255 -> "5,255억", 0 -> "0억", null -> "—" */
export function formatEok(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(Math.round(v));
  const jo = Math.floor(a / 10000);
  const rest = a % 10000;
  if (jo === 0) return `${sign}${rest.toLocaleString("ko-KR")}억`;
  if (rest === 0) return `${sign}${jo}조`;
  return `${sign}${jo}조 ${rest.toLocaleString("ko-KR")}억`;
}

/** 177549 -> "17.75조", 5255 -> "5,255억" (compact, for chips and axes) */
export function formatEokShort(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(2).replace(/\.?0+$/, "")}조`;
  return `${Math.round(v).toLocaleString("ko-KR")}억`;
}

/** 1.5 -> "▲ +1.5%", -15.3 -> "▼ −15.3%" (sign + arrow, never colour alone: COL-5) */
export function formatChange(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  return pct >= 0 ? `▲ +${Math.abs(pct).toFixed(1)}%` : `▼ −${Math.abs(pct).toFixed(1)}%`;
}

/** Percentage change from previous to current, one decimal. null when not computable. */
export function percentChange(prev: number | null | undefined, cur: number | null | undefined): number | null {
  if (prev == null || cur == null || prev === 0) return null;
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
}

/** Share of part in total, one decimal (64.9). */
export function share(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** "2026-11-24" -> "D-11" relative to today (Asia/Seoul date). Past -> "마감". */
export function dDay(deadline: string | null | undefined, today: Date = new Date()): string {
  if (!deadline) return "미정";
  const t = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const base = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const [y, m, d] = deadline.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const diff = Math.round((target - base) / 86400000);
  if (diff < 0) return "마감";
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}
