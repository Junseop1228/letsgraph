-- 공용 근거의 흔적 (specs/safety SAFE-03): a keyed hash of the person whose posting produced the evidence, so an admin
-- can remove everything one person added without the evidence saying who it was (lib/posting/creator.ts).
alter table public.job_link_evidence add column if not exists creator_hash text check (creator_hash is null or creator_hash ~ '^[0-9a-f]{16}$');
create index if not exists job_link_evidence_creator on public.job_link_evidence (creator_hash) where creator_hash is not null;