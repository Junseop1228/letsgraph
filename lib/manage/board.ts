// 카드 보드 행 만들기 (specs/portfolio PORT-03). Pure, unit-tested.
import type { Activity, Experience } from "@/lib/contracts/activity";

export type BoardRow = { activity: Activity | null; episodes: Experience[] };

/**
 * One row per activity (in the given order) with its episodes, then one row for episodes that belong to no known
 * activity (cards made before activities existed, or taken from a PDF in one go). Empty activities keep their row.
 */
export function boardRows(activities: Activity[], episodes: Experience[]): BoardRow[] {
  const known = new Set(activities.map((a) => a.id));
  const rows: BoardRow[] = activities.map((a) => ({ activity: a, episodes: episodes.filter((e) => e.activityId === a.id) }));
  const loose = episodes.filter((e) => !e.activityId || !known.has(e.activityId));
  if (loose.length) rows.push({ activity: null, episodes: loose });
  return rows;
}

/** Which STAR parts an episode has (for the S·T·A·R marks on a card). */
export function starParts(e: Pick<Experience, "situation" | "role" | "action" | "result">) {
  const has = (v?: string) => !!v && v.trim().length > 0 && !v.includes("직접 확인해서 넣어요");
  return [
    { key: "S", label: "상황", done: has(e.situation) },
    { key: "T", label: "맡은 일", done: has(e.role) },
    { key: "A", label: "행동", done: has(e.action) },
    { key: "R", label: "결과", done: has(e.result) },
  ];
}
