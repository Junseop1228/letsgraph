# letsGraph 앱

2026 ITM IT 서비스 아이디어 공모전 출품작의 웹 앱 소스예요. 기업의 돈 흐름(공시 실적)으로 산업과 직무를 이해하고, 공고와 내 경험을 이어 주는 취업 준비 서비스예요.

## 기술 구성

- Next.js(App Router) + TypeScript, Supabase(PostgreSQL, 인증), shadcn/ui + Tailwind CSS v4
- 기준 세 곳: 동작 = `specs/`, 디자인 = `design/DESIGN.md`, 데이터 형식 = `supabase/migrations/` + `lib/contracts/` (자세한 규칙은 `AGENTS.md`)
- 쓰는 오픈소스와 라이선스: `THIRD_PARTY_NOTICES.md` (`npm run licenses`로 다시 만들어요)

## 처음 실행하기 (키 없이)

1. `npm install`
2. `npm run dev` 후 http://localhost:3000 을 열어요. 키가 없으면 데모 데이터로 모든 화면이 열려요.

## 키 넣고 실제 데이터로 돌리기

1. `.env.example`을 복사해 `.env.local`을 만들고 값을 채워요. 키는 저장소에 올리지 않아요.
2. Supabase 연결: `npx supabase login` → `npm run db:link` (프로젝트 고르기) → `npm run db:push` (마이그레이션 적용)
3. 데모 데이터 넣기: `.env.local`에 `SEED_TOKEN`을 정하고 서버를 켠 뒤 `POST /api/dev/seed` (헤더 `x-seed-token`)
4. `.env.local`의 `DATA_SOURCE=supabase`로 바꾸면 화면이 DB를 읽어요.
5. DB 타입 만들기(선택): `npm run db:types` → `lib/database.types.ts`

## Vercel에 배포하기

1. Vercel에서 Add New → Project로 GitHub 저장소 `letsgraph`를 가져와요. Next.js는 자동으로 잡혀요. 함수 지역은 `vercel.json`이 서울(`icn1`)로 정해요. Supabase 팀 프로젝트가 서울이라서 DB 왕복이 짧아져요.
2. Environment Variables에 값을 넣어요. 값은 저장소나 채팅에 올리지 않아요.
   - 꼭 필요: `DATA_SOURCE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - 기능별: `DART_API_KEY`(공시 첫 조회 분석), `GOOGLE_GENERATIVE_AI_API_KEY`(AI 기능), `NEXT_PUBLIC_TOSS_CLIENT_KEY` + `TOSS_SECRET_KEY`(테스트 결제), `ADMIN_EMAILS`(관리자 메뉴), `NEXT_PUBLIC_POSTHOG_KEY`(선택)
   - 넣지 않는 값: `SEED_TOKEN`(없으면 `/api/dev/*`가 모두 403으로 잠겨요), `SUPABASE_DB_PASSWORD`(Supabase CLI 전용)
3. `NEXT_PUBLIC_*`와 `DATA_SOURCE`는 빌드할 때 코드에 박혀요. 바꾸면 다시 배포해야 해요.
4. Supabase 대시보드의 Authentication → URL Configuration에 배포 주소를 Site URL과 Redirect URLs(`https://<배포 주소>/**`)로 추가해요. 구글 로그인이 돌아올 주소예요.
5. 배포가 끝나면 `/api/health`에서 `source`가 `supabase`인지, 회사 수가 나오는지 확인해요.
6. Vercel은 DB 마이그레이션을 실행하지 않아요. 새 마이그레이션이 든 PR을 병합하면 팀 DB에 `db push`를 따로 해요.
7. 요금제는 Hobby(무료)예요. 함수 실행 시간은 최대 300초라서(`maxDuration = 300`), 오래 걸리는 데이터 수집은 로컬에서 돌려요.

## 디자인만 바꾸기

색, 글자 크기, 모서리 같은 값은 코드에 직접 쓰지 않고 토큰으로만 써요.

1. 프로젝트 루트의 `DESIGN.md`(또는 `design/DESIGN.md`)에서 값을 고쳐요. 어두운 모드 값은 `design/dark.json`이에요.
2. `npm run tokens`를 실행하면 `styles/tokens.css`가 다시 만들어지고, 켜 둔 개발 서버 화면에 바로 반영돼요.
3. `npm run lint`가 토큰 밖의 색(오류)과 임의 값(경고)을 잡아 줘요 (@shadcn/lint).

토큰 이름은 DESIGN.md와 같아요. 예: 배경 `bg-bg-sunken`, 글자 `text-text-secondary`, 테두리 `border-border-emphasized`, 글자 역할 `text-heading-1`, 숫자 `figures`.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 |
| `npm run check` | 코드 규칙 → 단위 시험 → 빌드 → 타입 → 브라우저 시험 한 번에 |
| `npm test` | 단위 시험 (Vitest) |
| `npm run test:e2e` | 브라우저 시험 (Playwright, 접근성 검사 포함) |
| `npm run lint` | 코드·디자인 규칙 검사 |
| `npm run tokens` | DESIGN.md에서 디자인 토큰 다시 만들기 |
| `npm run licenses` | 오픈소스 라이선스 목록 다시 만들기 |
| `npm run db:push` | Supabase에 마이그레이션 적용 |

GitHub에 올리면 같은 검사가 자동으로 돌아가요 (`.github/workflows/ci.yml`).
