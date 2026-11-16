import { catalog } from "@/lib/data";
import { CommandSearch, type SearchItem } from "@/components/search/command-search";

/** Server part of the header search: jobs + the companies with a detail page. Other companies are searched on demand
 *  (/api/catalog/search), since the catalogue holds thousands of companies. */
export async function HeaderSearch() {
  const repo = await catalog();
  const [roles, featured, industries] = await Promise.all([repo.jobRoles(), repo.companiesWithDetail(), repo.industries()]);
  const ind = Object.fromEntries(industries.map((i) => [i.id, i.name]));
  const items: SearchItem[] = [
    ...roles.map((r) => ({ kind: "job" as const, id: r.id, label: r.name, hint: r.description.slice(0, 40), href: `/explore/map?job=${r.id}` })),
    ...featured.map((c) => ({
      kind: "company" as const,
      id: c.id,
      label: c.name,
      hint: ind[c.industryId] ?? "",
      href: `/company/${c.id}`,
      revenue: c.revenue,
      ready: true, // audit C-3: the empty search shows only companies with a detail page
    })),
  ];
  return <CommandSearch items={items} industryNames={ind} />;
}
