-- 기업 성장률 (D 2026-11-17 step 5b: onboarding company-type card, '빠르게 크는 회사').
-- Average yearly revenue growth over the last three fiscal years, on the same basis as the headline figures
-- (연결 first, else 별도): (latest / two years before)^(1/2) - 1, so 0.15 = +15% a year.
-- Filled by the catalogue apply step (lib/reference/apply.ts); null when a year is missing or the base revenue <= 0.
alter table public.companies add column if not exists revenue_growth real;
