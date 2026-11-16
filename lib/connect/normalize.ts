// 연결 결과 다듬기 (specs/connection FR-PREM-02): keeps only links to activities and episodes that exist, fills their ids
// and titles, and makes every competency land in exactly one place (skills, links or gaps). Pure, unit-tested.
import type { Activity, ConnectionOutput, Experience } from "@/lib/contracts/activity";
import { findEpisode } from "@/lib/kit/plan";

export function normalizeConnection(raw: ConnectionOutput, episodes: Experience[], activities: Activity[], competencies: string[] = []): ConnectionOutput {
  const skills = (raw.skills ?? []).flatMap((s) => {
    const a = (s.activityId ? activities.find((x) => x.id === s.activityId) : undefined) ?? activities.find((x) => x.title === s.activityTitle);
    return a ? [{ ...s, activityId: a.id, activityTitle: a.title }] : [];
  });
  const skillNames = new Set(skills.map((s) => s.competency));
  const links = raw.links.flatMap((l) => {
    if (skillNames.has(l.competency)) return []; // one place per competency: a proven skill wins
    const e = findEpisode(episodes, l);
    return e ? [{ ...l, experienceId: e.id, experienceTitle: e.title }] : [];
  });
  const covered = new Set([...skillNames, ...links.map((l) => l.competency)]);
  const gaps = [...new Set([...raw.gaps, ...competencies])].filter((g) => !covered.has(g)).slice(0, 8);
  return { links, skills, gaps };
}

/** Which kind each competency was matched as, for the screen. */
export function competencyKind(c: ConnectionOutput, name: string): "skill" | "behavior" | "gap" | null {
  if ((c.skills ?? []).some((s) => s.competency === name)) return "skill";
  if (c.links.some((l) => l.competency === name)) return "behavior";
  if (c.gaps.includes(name)) return "gap";
  return null;
}
