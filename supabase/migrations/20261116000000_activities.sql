-- 활동 → 에피소드 (specs/portfolio PORT-03): an activity (project, club, internship, part-time job...) groups the
-- episodes taken from it. Episodes stay in public.experiences; old rows without an activity keep working.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  kind text not null check (kind in ('contest','club','parttime','course','intern','project','other')),
  period text,
  role text,
  summary text not null default '',
  scenes jsonb not null default '[]'::jsonb, -- 장면 후보 [{title, hint}] read from the PDF (the PDF itself is not stored)
  source_label text,
  created_at timestamptz not null default now()
);
create index activities_user_idx on public.activities (user_id, created_at);
alter table public.activities enable row level security;
create policy "own rows" on public.activities for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Data API grants (explicit since 2026-10-30, see 20261114000000_grants.sql)
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.activities to service_role;

-- episodes: the activity they come from (null = made before activities existed), STAR "T" (내가 맡은 일) and 배운 점
alter table public.experiences add column activity_id uuid references public.activities(id) on delete cascade;
alter table public.experiences add column role text not null default '';
alter table public.experiences add column learning text not null default '';
create index experiences_activity_idx on public.experiences (activity_id);
