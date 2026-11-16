import { catalog, userData } from "@/lib/data";
import { NotificationBell, type Note } from "@/components/header/notification-bell";

/** Server part of the bell: recent filings / IR items of every company with a detail page. The bell keeps the ones
 *  the visitor saved (server list, or the browser list before login), so saving a company fills it at once (audit C-2). */
export async function HeaderNotifications() {
  const [{ repo, demo }, cat] = await Promise.all([userData(), catalog()]);
  const [watched, companies] = await Promise.all([repo.watchedCompanyIds(), cat.companies()]);
  const notes: Note[] = [];
  for (const company of companies.filter((c) => c.hasDetail)) {
    const detail = await cat.companyDetail(company.id);
    if (!detail) continue;
    for (const u of detail.updates)
      notes.push({ id: `${company.id}:${u.date}:${u.title.slice(0, 24)}`, companyId: company.id, tag: u.tag, title: u.title, date: u.date, href: `/company/${company.id}`, company: company.name });
  }
  return <NotificationBell notes={notes} watchedInitial={watched} demo={demo} />;
}
