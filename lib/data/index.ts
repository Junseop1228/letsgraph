// Picks the data source. Default = fixtures (demo data, works without keys).
// Set DATA_SOURCE=supabase once the DB is migrated and seeded (see README).
import "server-only";
import { fixtureCatalog, fixtureUser } from "@/lib/data/fixture-repo";
import type { CatalogRepo, UserRepo } from "@/lib/data/repo";
import { hasEnvVars } from "@/lib/utils";

export function supabaseEnabled(): boolean {
  return !!hasEnvVars && process.env.DATA_SOURCE === "supabase";
}

export async function catalog(): Promise<CatalogRepo> {
  if (!supabaseEnabled()) return fixtureCatalog;
  const { supabaseCatalog } = await import("@/lib/data/supabase-repo");
  return supabaseCatalog;
}

/** Signed-out visitors (with the account store on): nothing personal, not even demo data (2026-11-18). */
const guestUser: UserRepo = {
  postings: async () => [],
  posting: async () => null,
  postingAnalysis: async () => null,
  experiences: async () => [],
  activities: async () => [],
  connection: async () => null,
  watchedCompanyIds: async () => [],
};

/**
 * User data. Without Supabase (local development, automated tests) the demo user's data is returned and `demo` is
 * true. Signed out with Supabase on: empty data and `guest` is true, so personal pages ask to log in (LoginPrompt).
 */
export async function userData(): Promise<{ repo: UserRepo; demo: boolean; guest: boolean }> {
  if (!supabaseEnabled()) return { repo: fixtureUser, demo: true, guest: false };
  const { createClient } = await import("@/lib/supabase/server");
  const { data } = await (await createClient()).auth.getClaims();
  if (!data?.claims) return { repo: guestUser, demo: false, guest: true };
  const { supabaseUser } = await import("@/lib/data/supabase-repo");
  return { repo: supabaseUser, demo: false, guest: false };
}
