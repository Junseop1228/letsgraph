# LetsGraph (가칭) 앱

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
