// Month grid for the deadline calendar (specs/posting POST-02). Weeks start on Sunday.
export type Day = { iso: string; day: number; inMonth: boolean };

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** month: 1-12 */
export function monthGrid(year: number, month: number): Day[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startDow = first.getUTCDay();
  const daysIn = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Day[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1, -i));
    cells.push({ iso: iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), day: d.getUTCDate(), inMonth: false });
  }
  for (let d = 1; d <= daysIn; d++) cells.push({ iso: iso(year, month, d), day: d, inMonth: true });
  while (cells.length % 7) {
    const k = cells.length - startDow - daysIn + 1;
    const d = new Date(Date.UTC(year, month, k));
    cells.push({ iso: iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), day: d.getUTCDate(), inMonth: false });
  }
  const weeks: Day[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Today's date in Seoul as YYYY-MM-DD */
export function seoulToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
