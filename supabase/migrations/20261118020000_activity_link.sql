-- 활동 링크 (specs/portfolio PORT-06): the page an activity card was made from or points to, such as its GitHub
-- repository. Which sites are allowed is decided in the app (lib/activity/link.ts; GitHub only for now).
alter table public.activities add column if not exists link_url text
  check (link_url is null or (char_length(link_url) <= 2048 and link_url ~ '^https://'));
