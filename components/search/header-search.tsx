import { catalog } from "@/lib/data";
import { CommandSearch, type SearchItem } from "@/components/search/command-search";

/** Server part of the header search: builds the index (jobs + companies) from the catalogue. */
export async function HeaderSearch() {
  const repo = await catalog();
  const [roles, companies, industries] = await Promise.all([repo.jobRoles(), repo.companies(), repo.industries()]);
  const ind = new Map(industries.map((i) => [i.id, i.name]));
  const items: SearchItem[] = [
    ...roles.map((r) => ({ kind: "job" as const, id: r.id, label: r.name, hint: r.description.slice(0, 40), href: `/explore/map?job=${r.id}` })),
    ...companies.map((c) => ({
      kind: "company" as const,
      id: c.id,
      label: c.name,
      hint: `${ind.get(c.industryId) ?? ""}${c.hasDetail ? "" : " · 상세 준비 중"}`,
      href: `/company/${c.id}`,
      revenue: c.revenue,
    })),
  ];
  return <CommandSearch items={items} />;
}
