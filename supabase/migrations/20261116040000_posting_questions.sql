-- 지원서 문항 (specs/prompt-kit FR-PREM-04): the real 자기소개서·경력기술서 questions of a posting, pasted by the user
-- and saved so they need not be pasted again. [{id, text, maxChars, minChars, type}], at most 10. Own rows only (RLS).
alter table public.job_postings add column questions jsonb not null default '[]'::jsonb;
