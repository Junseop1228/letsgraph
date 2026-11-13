# LetsGraph (가칭) 앱

2026 ITM IT 서비스 아이디어 공모전 출품작의 웹 앱 소스예요. 기업의 돈 흐름(공시 실적)으로 산업과 직무를 이해하고, 공고와 내 경험을 이어 주는 취업 준비 서비스예요.

## 기술 구성

- Next.js(App Router) + TypeScript, Supabase(PostgreSQL, 인증), shadcn/ui + Tailwind CSS v4
- 디자인 기준: `design/DESIGN.md` (원본은 프로젝트 폴더 루트의 `DESIGN.md`)
- 글꼴: Pretendard (SIL Open Font License 1.1)

## 처음 실행하기

1. `npm install`
2. `.env.example`을 복사해 `.env.local`을 만들고 값을 채워요. 키는 저장소에 올리지 않아요.
3. `npm run dev` 후 http://localhost:3000 을 열어요.

## 디자인만 바꾸기

색, 글자 크기, 모서리 같은 값은 코드에 직접 쓰지 않고 토큰으로만 써요.

1. 프로젝트 루트의 `DESIGN.md`(또는 `design/DESIGN.md`)에서 값을 고쳐요. 어두운 모드 값은 `design/dark.json`이에요.
2. `npm run tokens` 를 실행하면 `styles/tokens.css`가 다시 만들어지고, 켜 둔 개발 서버 화면에 바로 반영돼요.

토큰 이름은 DESIGN.md와 같아요. 예: 배경 `bg-bg-sunken`, 글자 `text-text-secondary`, 테두리 `border-border-emphasized`, 글자 역할 `text-heading-1`, 숫자 `figures`.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 |
| `npm run typecheck` | 타입 검사 |
| `npm run lint` | 코드 규칙 검사 |
| `npm run tokens` | DESIGN.md에서 디자인 토큰 다시 만들기 |
