// Top navigation. Decided 2026-10-30: 탐색 / 분석 / 관리 (3 tabs).
// OPEN for team confirmation (decisions.md 2026-11-11, item a): the teammate spec uses 탐색 / 공고 / 관리 / 연결.
// Changing the tab set = editing this array only.
export type NavItem = { href: string; label: string; id: string };

export const MAIN_NAV: NavItem[] = [
  { id: "explore", href: "/explore", label: "탐색" },
  { id: "analysis", href: "/analysis", label: "분석" },
  { id: "manage", href: "/manage", label: "관리" },
];
