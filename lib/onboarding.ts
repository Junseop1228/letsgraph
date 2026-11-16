// 직무 카드 온보딩은 이 브라우저에 처음 들어왔을 때 한 번만 자동으로 보인다 (decisions 2026-11-16, specs/explore FR-DISC-01).
// Shared by proxy.ts (server redirect) and the card deck (sets the cookie when it is shown).
export const ONBOARDED_COOKIE = "lg_onboarded";
export const JOB_COOKIE = "lg_job";
export const MAP_PATH = "/explore/map";
/** The job bar's "직무 더 고르기" opens the deck on purpose; any query on /explore skips the redirect. */
export const DECK_AGAIN_PATH = "/explore?more=1";

/** True when this browser has seen the deck, or picked a job before this rule existed. */
export function hasOnboarded(get: (name: string) => string | undefined): boolean {
  return !!get(ONBOARDED_COOKIE) || !!get(JOB_COOKIE);
}

export function markOnboarded() {
  document.cookie = `${ONBOARDED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
}
