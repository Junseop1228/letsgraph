-- 활동의 사용한 데이터 (specs/portfolio PORT-03): name, size and source of the data an activity used, in one line
-- (e.g. "MNIST 손글씨 이미지 7만 장, 공개 데이터"). Null for activities that used no data.
alter table public.activities add column dataset text check (dataset is null or char_length(dataset) <= 200);
