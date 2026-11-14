// Top navigation (decisions 2026-11-14: 4 tabs per the teammate screen spec). Changing the tab set = editing this array only.
export type NavItem = { href: string; label: string; id: string; match: string[] };

export const MAIN_NAV: NavItem[] = [
  { id: "explore", href: "/explore", label: "탐색", match: ["/explore", "/company"] },
  { id: "postings", href: "/postings", label: "공고", match: ["/postings"] },
  { id: "manage", href: "/manage", label: "관리", match: ["/manage"] },
  { id: "connect", href: "/connect", label: "연결", match: ["/connect"] },
];
