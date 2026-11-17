-- 공고 근거 (specs/posting POST-07): evidence that a company hires a job, confirmed from a user's posting
-- (submitted job-board URL, or a web search that found the posting on the company's site or a job board).
-- Evidence piles up here; job_links (basis 'posting') and segment_job_roles are the results the graph reads.
-- Shared catalogue data: no user id, no posting text, only where it was confirmed. Written by the server only.
create table public.job_link_evidence (
  id uuid primary key default gen_random_uuid(),
  job_role_id text not null references public.job_roles(id),
  company_id text not null references public.companies(id) on delete cascade,
  segment_id text references public.business_segments(id) on delete set null,
  source_domain text not null check (char_length(source_domain) between 3 and 253),
  source_url text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https?://')),
  method text not null check (method in ('submitted_url', 'web_search')),
  checked_at timestamptz not null default now()
);
create unique index job_link_evidence_once on public.job_link_evidence (job_role_id, company_id, coalesce(segment_id, ''), source_domain);
create index job_link_evidence_company on public.job_link_evidence (company_id);
alter table public.job_link_evidence enable row level security; -- no policies: server (service role) only
grant select, insert, update, delete on public.job_link_evidence to service_role;
