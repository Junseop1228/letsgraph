-- 대화 기록 (specs/portfolio PORT-02): the conversation that made an episode is kept with it, so it can be read again.
-- Own rows only (RLS on experiences); deleted with the episode. At most 40 turns of 2,000 characters (lib/contracts ChatLog).
alter table public.experiences add column chat_log jsonb not null default '[]'::jsonb;
