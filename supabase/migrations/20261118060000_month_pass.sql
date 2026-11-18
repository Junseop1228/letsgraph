-- 30일 패스 (specs/billing BILL-01b, BM 제안서 2026-11-18): passes are now 'month' (30일, 9,900원) and 'season'
-- (90일, 19,900원). 'single' stays valid for old rows.
alter table public.orders drop constraint if exists orders_pass_type_check;
alter table public.orders add constraint orders_pass_type_check check (pass_type in ('month', 'season', 'single'));
alter table public.passes drop constraint if exists passes_pass_type_check;
alter table public.passes add constraint passes_pass_type_check check (pass_type in ('month', 'season', 'single'));
create index if not exists quota_usage_feature_time on public.quota_usage (user_id, feature, created_at);
