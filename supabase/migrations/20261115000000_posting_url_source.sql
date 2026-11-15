-- 공고 주소로 정리하기 (specs/posting POST-03): a posting can come from an address the user entered.
-- source 'url' = fetched from the user's address (one page, at the user's request); source_url keeps that address.
alter table public.job_postings drop constraint if exists job_postings_source_check;
alter table public.job_postings
  add constraint job_postings_source_check check (source in ('upload', 'url', 'demo'));
alter table public.job_postings add column if not exists source_url text
  check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https?://'));
