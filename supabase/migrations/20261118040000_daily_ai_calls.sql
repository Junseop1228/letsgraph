-- 하루 AI 상한 (specs/safety SAFE-04): one quota_usage row per AI call of the 경험 대화 and card making, counted per
-- Korean day against lib/contracts/billing.ts DAILY_AI_LIMITS.
alter table public.quota_usage drop constraint if exists quota_usage_feature_check;
alter table public.quota_usage add constraint quota_usage_feature_check
  check (feature in ('posting_analysis', 'experience_extraction', 'connection', 'prompt_kit', 'activity_save', 'episode_save', 'ai_call'));
create index if not exists quota_usage_user_feature_time on public.quota_usage (user_id, feature, created_at);
