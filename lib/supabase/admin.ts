// Server-only Supabase client with the secret key. Bypasses RLS: use only for writes the user may not do
// directly (AI results after validation, orders and passes, collector). Never import from client code.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase URL or SUPABASE_SECRET_KEY is not set");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
