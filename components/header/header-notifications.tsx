import { catalog, userData } from "@/lib/data";
import { NotificationBell, type Note } from "@/components/header/notification-bell";

/** Server part of the bell: the newest filings / IR items of all companies, in one query. The bell keeps the ones
 *  the visitor saved (server list, or the browser list before login), so saving a company fills it at once (audit C-2).
 *  (Was one detail query per company with a detail page: every page took 10+ s once ~180 companies had details.) */
export async function HeaderNotifications() {
  const [{ repo, demo }, cat] = await Promise.all([userData(), catalog()]);
  const [watched, recent] = await Promise.all([repo.watchedCompanyIds(), cat.recentUpdates(300)]);
  const notes: Note[] = recent.map(({ companyId, companyName, update: u }) => ({
    id: `${companyId}:${u.date}:${u.title.slice(0, 24)}`,
    companyId,
    tag: u.tag,
    title: u.title,
    date: u.date,
    href: `/company/${companyId}`,
    company: companyName,
  }));
  return <NotificationBell notes={notes} watchedInitial={watched} demo={demo} />;
}
