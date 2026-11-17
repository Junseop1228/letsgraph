import { userData } from "@/lib/data";
import { NotificationBell } from "@/components/header/notification-bell";

/** Server part of the bell: only the saved list. The bell fetches the newest filings of the saved companies itself
 *  (/api/catalog/updates), so saving a company fills it at once (audit C-2) and no page waits for filings.
 *  (Was one detail query per company with a detail page: every page took 10+ s once ~180 companies had details.) */
export async function HeaderNotifications() {
  const { repo, demo } = await userData();
  return <NotificationBell watchedInitial={await repo.watchedCompanyIds()} demo={demo} />;
}
