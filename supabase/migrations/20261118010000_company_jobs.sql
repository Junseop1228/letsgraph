-- 회사 직무 소개 (specs/data-pipeline FR-OPS-04): the jobs a company lists on its own "직무 소개" page, imported by an
-- admin. Each row is the company's job name and group, a short summary written by the AI in its own words (never the
-- company's text), the matching job of lib/reference/jobs.ts, and the page it came from.
create table public.company_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete cascade,
  family text not null default '' check (char_length(family) <= 40),
  name text not null check (char_length(name) between 1 and 60),
  summary text not null default '' check (char_length(summary) <= 300),
  job_role_id text references public.job_roles(id),
  source_url text not null check (char_length(source_url) <= 2048 and source_url ~ '^https?://'),
  imported_at timestamptz not null default now()
);
create unique index company_jobs_once on public.company_jobs (company_id, name);
alter table public.company_jobs enable row level security; -- no policies yet: server (service role) only
grant select, insert, update, delete on public.company_jobs to service_role;

-- a company's own job list is evidence too
alter table public.job_link_evidence drop constraint if exists job_link_evidence_method_check;
alter table public.job_link_evidence add constraint job_link_evidence_method_check
  check (method in ('submitted_url', 'web_search', 'company_page'));
