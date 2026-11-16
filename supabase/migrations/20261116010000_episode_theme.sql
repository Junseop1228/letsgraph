-- 에피소드 테마 (specs/portfolio PORT-04): which kind of 자소서 question an episode serves
-- (problem = 문제 해결·직무 역량, collab = 협업·갈등, growth = 성장·가치관, motive = 직무 관심 계기). Null for older cards.
alter table public.experiences add column theme text
  check (theme is null or theme in ('problem', 'collab', 'growth', 'motive'));
