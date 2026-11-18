// 직무 카드 온보딩은 이 브라우저에서 카드를 끝내거나 건너뛸 때까지 탐색 탭에 나온다 (decisions 2026-11-16, 2026-11-18;
// specs/explore FR-DISC-01). 도중에 다른 탭에 갔다 오면 같은 세션 안에서는 하던 곳부터 이어진다 (cookie lg_deck).
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
/** The 탐색 tab: the deck until it is finished or skipped, the graph after that (proxy.ts). "/" is the first screen. */
export const EXPLORE_PATH = "/explore";
/** Progress of an unfinished deck, kept for this browser session only. */
export const DECK_COOKIE = "lg_deck";

export type DeckProgress = {
  stage: "family" | "jobs";
  fams: string[];
  i: number;
  liked: string[];
  history: boolean[];
  inds: string[];
  typeStep: boolean;
};

const YEAR = "path=/; max-age=31536000; samesite=lax";
const GONE = "path=/; max-age=0; samesite=lax";
const SESSION = "path=/; samesite=lax";

/** True when this browser finished or skipped the deck, or already has a primary job. */
export function hasOnboarded(get: (name: string) => string | undefined): boolean {
  return !!get(ONBOARDED_COOKIE) || !!get(JOB_COOKIE);
}

/** Set when the deck ends (finished or skipped), not when it is shown: a visitor who leaves mid-way gets it back. */
export function markOnboarded() {
  document.cookie = `${ONBOARDED_COOKIE}=1; ${YEAR}`;
}

export function saveDeckProgress(p: DeckProgress) {
  document.cookie = `${DECK_COOKIE}=${encodeURIComponent(JSON.stringify(p))}; ${SESSION}`;
}

export function clearDeckProgress() {
  document.cookie = `${DECK_COOKIE}=; ${GONE}`;
}

const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Server side: the saved unfinished deck, or null when there is none or it does not parse. */
export function readDeckProgress(get: (name: string) => string | undefined): DeckProgress | null {
  const raw = get(DECK_COOKIE);
  if (!raw) return null;
  try {
    const p = JSON.parse(decodeURIComponent(raw));
    const ok =
      (p?.stage === "family" || p?.stage === "jobs") &&
      strings(p.fams) &&
      Number.isInteger(p.i) &&
      p.i >= 0 &&
      strings(p.liked) &&
      Array.isArray(p.history) &&
      p.history.every((x: unknown) => typeof x === "boolean") &&
      strings(p.inds) &&
      typeof p.typeStep === "boolean";
    return ok ? (p as DeckProgress) : null;
  } catch {
    return null;
  }
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
