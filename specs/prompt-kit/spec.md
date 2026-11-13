# Prompt Kit (prompt-kit)

근거: SRS v1.0 FR-PREM-03 · 결정 2026-10-27 (핵심 기능 = Prompt Kit) · 조립: `lib/kit/build.ts` (AI 호출 없음) · 화면: `app/(main)/analysis/posting/[id]/kit/`

## Requirements

### Requirement: FR-PREM-03 Prompt Kit 만들기
시스템은 공고 정리, 사업부 맥락, 연결 결과, 경험 카드를 묶어 사용자가 자기 AI에 붙여 넣을 Prompt Kit(`PromptKit`)을 만들고, 복사와 내려받기(마크다운, PDF)를 할 수 있게 해야 한다(SHALL). Kit은 검증된 조각만으로 조립하고 새 사실을 만들지 않는다. 프리미엄 기능이다.

#### Scenario: Kit 열기
- **WHEN** 공고 정리와 연결 결과가 있는 공고에서 Prompt Kit을 열면
- **THEN** 역할과 규칙, 공고(출처 표시), 사업부 맥락(공시 수치), 연결마다 에피소드 하나, 빈 역량 지시, 규칙이 순서대로 들어간 키트와 문항 유형별 가이드(지원동기, 직무 역량, 협업·갈등)가 보인다

#### Scenario: 복사·내려받기
- **WHEN** 사용자가 복사, 마크다운, PDF 중 하나를 누르면
- **THEN** 키트 전문이 클립보드에 들어가거나, `.md` 파일로 내려받아지거나, 인쇄 화면(가이드 없이 키트만)이 열린다

#### Scenario: 재료가 부족함
- **WHEN** 공고 정리나 연결 결과가 없는 공고에서 Kit을 열면
- **THEN** 둘 다 있어야 만들 수 있다고 알린다
