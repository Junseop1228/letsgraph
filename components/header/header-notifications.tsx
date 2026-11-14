import { catalog, userData } from "@/lib/data";
import { NotificationBell, type Note } from "@/components/header/notification-bell";

/** Server part of the bell: recent filings / IR items of the user's saved companies (newest 3). */
export async function HeaderNotifications() {
  const [{ repo, demo }, cat] = await Promise.all([userData(), catalog()]);
  const watched = await repo.watchedCompanyIds();
  const notes: Note[] = [];
  for (const id of watched) {
    const [company, detail] = await Promise.all([cat.company(id), cat.companyDetail(id)]);
    if (!company || !detail) continue;
    for (const u of detail.updates)
      notes.push({ id: `${id}:${u.date}:${u.title.slice(0, 24)}`, tag: u.tag, title: u.title, date: u.date, href: `/company/${id}`, company: company.name });
  }
  notes.sort((a, b) => (a.date < b.date ? 1 : -1));
  return <NotificationBell notes={notes.slice(0, 3)} demo={demo} />;
}
