// 카드 지문 (specs/connection, specs/prompt-kit "오래된 결과"): a short fingerprint of the cards a connection result or a
// question matching was made from. When the user's activities or episodes change, the fingerprint changes and the screens
// say the result is out of date. Pure.
import type { Activity, Experience } from "@/lib/contracts/activity";

/** FNV-1a 32-bit, hex. Enough to tell "the same set of cards" from "a different one"; not for security. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The episodes (and, for connection results, activities) in a result, as one fingerprint. Order does not matter. */
export function cardsKey(episodes: Pick<Experience, "id">[], activities: Pick<Activity, "id">[] = []): string {
  const ids = [...episodes.map((e) => `e:${e.id}`), ...activities.map((a) => `a:${a.id}`)].sort();
  return `${ids.length}-${fnv1a(ids.join("|"))}`;
}

/** A stored fingerprint that no longer matches the cards now. Results made before fingerprints existed are not flagged. */
export function isStale(stored: string | undefined, now: string): boolean {
  return !!stored && stored !== now;
}
