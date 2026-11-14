-- Explicit Data API grants (Supabase: new tables in public are not exposed automatically since 2026-05-30
-- for new projects and 2026-10-30 for all projects). RLS policies in 20261113000000_init.sql still decide
-- which rows; these grants decide which roles may touch which tables at all.

-- reference data: anyone may read
grant select on public.industries, public.job_families, public.job_roles, public.companies,
  public.company_financials, public.business_segments, public.segment_job_roles,
  public.segment_details, public.company_details, public.job_links, public.company_updates
  to anon, authenticated;

-- the user's own rows (RLS: user_id = auth.uid())
grant select, insert, update, delete on public.profiles, public.interest_profiles,
  public.watched_companies, public.job_postings, public.experiences, public.prompt_kits
  to authenticated;

-- AI results, billing: users read their own; the server writes with the secret key
grant select on public.posting_analyses, public.connections, public.orders, public.passes
  to authenticated;

-- quota usage: users read and add their own rows (adding only lowers their own remaining quota)
grant select, insert on public.quota_usage to authenticated;
grant usage, select on sequence public.quota_usage_id_seq to authenticated;
create policy "own insert" on public.quota_usage for insert with check (user_id = auth.uid());

-- server key: everything in public (collector tables are server-only)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
