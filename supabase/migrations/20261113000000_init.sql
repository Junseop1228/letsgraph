-- Schema v0 (Inc 0). Contracts: lib/contracts/*.ts. Specs: specs/*/spec.md.
-- Money columns are in 억원 (integer). Times are timestamptz (UTC); dates of sources are date.

-- ---------- reference data (public read) ----------
create table public.industries (
  id text primary key,
  name text not null
);

create table public.job_families (
  id text primary key,
  name text not null
);

create table public.job_roles (
  id text primary key,
  family_id text not null references public.job_families(id),
  name text not null,
  description text not null default ''
);

create table public.companies (
  id text primary key,
  corp_code char(8) unique,                 -- DART 고유번호
  name text not null,
  industry_id text references public.industries(id),
  industry_reviewed boolean not null default false, -- FR-OPS-01: only reviewed rows are shown in industry views
  stock_code text,
  bizr_no text,                             -- 사업자등록번호 (joins postings)
  induty_code text,                         -- 업종 코드 (KSIC)
  revenue integer,
  operating_income integer,
  fiscal_year integer,
  basis_note text,
  source_kind text check (source_kind in ('filing','ir','calculated','estimate','ai')),
  source_label text,
  source_date date,
  has_detail boolean not null default false,
  collected_at timestamptz
);
create index companies_name_idx on public.companies using gin (to_tsvector('simple', name));

create table public.company_financials (
  company_id text not null references public.companies(id) on delete cascade,
  year integer not null,
  fs_div text not null check (fs_div in ('CFS','OFS')),  -- 연결 / 별도 (NFR-DOM-01)
  revenue integer,
  operating_income integer,
  rcept_no char(14) not null,
  collected_at timestamptz not null default now(),
  primary key (company_id, year, fs_div)
);

create table public.business_segments (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  name text not null,
  short_name text not null,
  revenue integer,
  operating_income integer,
  fiscal_year integer,
  calculated boolean not null default false,
  summary text not null default '',
  ai_generated boolean not null default true,
  source_rcept_no char(14),
  updated_at timestamptz not null default now()
);

create table public.segment_job_roles (
  segment_id text not null references public.business_segments(id) on delete cascade,
  job_role_id text not null references public.job_roles(id),
  primary key (segment_id, job_role_id)
);

create table public.segment_details (
  segment_id text primary key references public.business_segments(id) on delete cascade,
  flow jsonb not null,
  flow_source jsonb not null,
  trend jsonb not null,
  trend_source jsonb not null,
  job_notes jsonb not null default '{}'::jsonb,
  example_posting_id text,
  news_query text not null default '',
  updated_at timestamptz not null default now()
);

create table public.company_details (
  company_id text primary key references public.companies(id) on delete cascade,
  trend jsonb not null,
  trend_source jsonb not null,
  news_query text not null default '',
  updated_at timestamptz not null default now()
);

create table public.job_links (
  job_role_id text not null references public.job_roles(id),
  company_id text not null references public.companies(id) on delete cascade,
  basis text not null check (basis in ('posting','estimated')),
  primary key (job_role_id, company_id)
);

create table public.company_updates (
  id bigint generated always as identity primary key,
  company_id text not null references public.companies(id) on delete cascade,
  segment_id text references public.business_segments(id) on delete set null,
  tag text not null,
  title text not null,
  date date not null,
  kind text not null check (kind in ('disclosure','ir','release')),
  source_label text not null,
  rcept_no char(14)
);
create index company_updates_company_idx on public.company_updates (company_id, date desc);

-- ---------- collector (server only) ----------
create table public.collector_runs (
  id bigint generated always as identity primary key,
  source text not null,                     -- 'dart', ...
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok_count integer not null default 0,
  fail_count integer not null default 0,
  calls_used integer not null default 0,
  deferred boolean not null default false,  -- FR-OPS-02 E2
  note text
);

create table public.collector_failures (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.collector_runs(id) on delete cascade,
  target text not null,                     -- corp_code or rcept_no
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------- users ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent jsonb not null,                   -- {"terms":true,"privacy":true,"ai":true} (FR-ACCT-01)
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.interest_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_job_role_id text references public.job_roles(id),
  liked_job_role_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.watched_companies (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id text references public.companies(id) on delete set null,
  company_name text not null,
  segment_id text references public.business_segments(id) on delete set null,
  title text not null,
  job_role_id text references public.job_roles(id),
  deadline date,
  deadline_note text,
  status text not null default 'interested' check (status in ('interested','applied','interview','passed','rejected')),
  source text not null default 'upload' check (source in ('upload','demo')),
  created_at timestamptz not null default now()
);
create index job_postings_user_idx on public.job_postings (user_id, deadline);

create table public.posting_analyses (
  posting_id uuid primary key references public.job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  output jsonb not null,                    -- PostingAnalysisOutput (validated before insert)
  model text not null,
  created_at timestamptz not null default now()
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('contest','club','parttime','course','intern','project','other')),
  period text,
  situation text not null default '',
  action text not null default '',
  result text not null default '',
  competencies text[] not null default '{}',
  source_label text,
  created_at timestamptz not null default now()
);

create table public.connections (
  posting_id uuid primary key references public.job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  output jsonb not null,                    -- ConnectionOutput
  model text not null,
  created_at timestamptz not null default now()
);

create table public.prompt_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  posting_id uuid references public.job_postings(id) on delete set null,
  title text not null,
  sections jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------- billing (specs/billing) ----------
-- orders double as payment records: user_id is nulled on account deletion and the row is kept (FR-ACCT-05).
create table public.orders (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{6,64}$'),  -- Toss orderId
  user_id uuid references auth.users(id) on delete set null,
  pass_type text not null check (pass_type in ('season','single')),
  amount integer not null check (amount > 0),
  status text not null default 'created'
    check (status in ('created','pending','confirming','paid','granted','canceled','failed','grant_failed')),
  payment_key text unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pass_type text not null check (pass_type in ('season','single')),
  order_id text not null unique references public.orders(id),  -- one pass per order (idempotent grant)
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  uses_left integer,
  created_at timestamptz not null default now()
);

create table public.quota_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('posting_analysis','experience_extraction','connection','prompt_kit')),
  created_at timestamptz not null default now()
);
create index quota_usage_user_month_idx on public.quota_usage (user_id, created_at);

-- ---------- row level security ----------
alter table public.industries enable row level security;
alter table public.job_families enable row level security;
alter table public.job_roles enable row level security;
alter table public.companies enable row level security;
alter table public.company_financials enable row level security;
alter table public.business_segments enable row level security;
alter table public.segment_job_roles enable row level security;
alter table public.segment_details enable row level security;
alter table public.company_details enable row level security;
alter table public.job_links enable row level security;
alter table public.company_updates enable row level security;
alter table public.collector_runs enable row level security;
alter table public.collector_failures enable row level security;
alter table public.profiles enable row level security;
alter table public.interest_profiles enable row level security;
alter table public.watched_companies enable row level security;
alter table public.job_postings enable row level security;
alter table public.posting_analyses enable row level security;
alter table public.experiences enable row level security;
alter table public.connections enable row level security;
alter table public.prompt_kits enable row level security;
alter table public.orders enable row level security;
alter table public.passes enable row level security;
alter table public.quota_usage enable row level security;

-- reference data: anyone may read (anon included); writes only via the server key (bypasses RLS)
create policy "public read" on public.industries for select using (true);
create policy "public read" on public.job_families for select using (true);
create policy "public read" on public.job_roles for select using (true);
create policy "public read" on public.companies for select using (true);
create policy "public read" on public.company_financials for select using (true);
create policy "public read" on public.business_segments for select using (true);
create policy "public read" on public.segment_job_roles for select using (true);
create policy "public read" on public.segment_details for select using (true);
create policy "public read" on public.company_details for select using (true);
create policy "public read" on public.job_links for select using (true);
create policy "public read" on public.company_updates for select using (true);
-- collector tables: no policies -> server key only

-- own rows only (NFR-PROD-09)
create policy "own rows" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.interest_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.watched_companies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.job_postings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.experiences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.prompt_kits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- AI results, orders, passes, quota: users read their own; writes happen on the server after validation
create policy "own read" on public.posting_analyses for select using (user_id = auth.uid());
create policy "own read" on public.connections for select using (user_id = auth.uid());
create policy "own read" on public.orders for select using (user_id = auth.uid());
create policy "own read" on public.passes for select using (user_id = auth.uid());
create policy "own read" on public.quota_usage for select using (user_id = auth.uid());
