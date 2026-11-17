-- 무료 한도 (specs/billing BILL-01, 2026-11-18): saved activities and episodes count against the free limits
-- (lib/contracts/billing.ts FREE_LIMITS). The single pass was dropped; old 'single' rows stay valid history.
alter table public.quota_usage drop constraint if exists quota_usage_feature_check;
alter table public.quota_usage add constraint quota_usage_feature_check
  check (feature in ('posting_analysis', 'experience_extraction', 'connection', 'prompt_kit', 'activity_save', 'episode_save'));
create index if not exists quota_usage_user_feature on public.quota_usage (user_id, feature);