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

/** User data. Without Supabase (or when signed out) the demo user's data is returned and `demo` is true. */
export async function userData(): Promise<{ repo: UserRepo; demo: boolean }> {
  if (!supabaseEnabled()) return { repo: fixtureUser, demo: true };
  const { createClient } = await import("@/lib/supabase/server");
  const { data } = await (await createClient()).auth.getClaims();
  if (!data?.claims) return { repo: fixtureUser, demo: true };
  const { supabaseUser } = await import("@/lib/data/supabase-repo");
  return { repo: supabaseUser, demo: false };
}
