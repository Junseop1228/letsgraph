// 직무 카드 온보딩은 이 브라우저에 처음 들어왔을 때 한 번만 자동으로 보인다 (decisions 2026-11-16, specs/explore FR-DISC-01).
// Shared by proxy.ts (server redirect), the card deck (sets the cookies) and the graph page (reads the choices).
import { isCompanyType, type CompanyType } from "@/lib/explore/company-type";

export const ONBOARDED_COOKIE = "lg_onboarded";
export const JOB_COOKIE = "lg_job";
/** industries picked on the onboarding industry card (comma-separated ids); none = the job's closest industries */
export const INDUSTRY_COOKIE = "lg_industries";
/** company type picked on the onboarding company-type card; none = 상관없어요 */
export const COMPANY_TYPE_COOKIE = "lg_company_type";
export const MAP_PATH = "/explore/map";
/** The job bar's "직무 더 고르기" opens the deck on purpose; any query on /explore skips the redirect. */
export const DECK_AGAIN_PATH = "/explore?more=1";

const YEAR = "path=/; max-age=31536000; samesite=lax";
const GONE = "path=/; max-age=0; samesite=lax";

/** True when this browser has seen the deck, or picked a job before this rule existed. */
export function hasOnboarded(get: (name: string) => string | undefined): boolean {
  return !!get(ONBOARDED_COOKIE) || !!get(JOB_COOKIE);
}

export function markOnboarded() {
  document.cookie = `${ONBOARDED_COOKIE}=1; ${YEAR}`;
}

/** Keeps the industry card's choice for the graph page; an empty choice removes the cookie. */
export function saveIndustryChoice(ids: string[]) {
  document.cookie = ids.length ? `${INDUSTRY_COOKIE}=${encodeURIComponent(ids.join(","))}; ${YEAR}` : `${INDUSTRY_COOKIE}=; ${GONE}`;
}

/** Keeps the company-type card's choice; null (상관없어요) removes the cookie. */
export function saveCompanyType(t: CompanyType | null) {
  document.cookie = t ? `${COMPANY_TYPE_COOKIE}=${t}; ${YEAR}` : `${COMPANY_TYPE_COOKIE}=; ${GONE}`;
}

/** Server side: the saved industry choice, or null when there is none. */
export function readIndustryChoice(get: (name: string) => string | undefined): string[] | null {
  const raw = get(INDUSTRY_COOKIE);
  if (!raw) return null;
  const ids = decodeURIComponent(raw).split(",").filter(Boolean);
  return ids.length ? ids : null;
}

/** Server side: the saved company type, or null. */
export function readCompanyType(get: (name: string) => string | undefined): CompanyType | null {
  const v = get(COMPANY_TYPE_COOKIE);
  return isCompanyType(v) ? v : null;
}
