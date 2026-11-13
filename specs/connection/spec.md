# 연결 (connection)

근거: SRS v1.0 FR-PREM-02, EX-03, EX-04, EX-05 · 계약: `lib/contracts/activity.ts` (`ConnectionOutput`) · AI: `lib/ai/tasks.ts` (`connect`) · 화면: `app/(main)/analysis/posting/[id]/connection/`

## Requirements

### Requirement: FR-PREM-02 연결 결과
시스템은 공고의 요구 역량과 사용자의 경험 카드를 이어, 각 연결의 근거(사업부 맥락 포함)와 아직 보여줄 경험이 없는 역량(빈 역량)을 보여줘야 한다(SHALL). 무료 이용자는 연결 개수까지만 본다. 쿼터가 적용된다.

#### Scenario: 연결 결과 만들기
- **WHEN** 패스가 있는 사용자가 연결 결과가 없는 공고에서 "연결 결과 만들기"를 누르면
- **THEN** AI 결과를 형식 검증한 뒤 저장하고 쿼터 1회를 쓰며, 역량-경험 연결과 이유, 맥락, 빈 역량이 보인다

#### Scenario: 무료 이용자 (EX-05)
- **WHEN** 패스가 없는 사용자가 연결 결과를 열면
- **THEN** 연결 지점의 개수와 패스 안내만 보인다

#### Scenario: 등록된 경험이 없음 (E1)
- **WHEN** 경험 카드가 하나도 없는 사용자가 연결 결과를 만들려 하면
- **THEN** 만들지 않고 경험 카드를 먼저 만들라고 안내한다

#### Scenario: 빈 역량
- **WHEN** 연결된 경험이 없는 역량이 있으면
- **THEN** 그 역량은 점선으로 표시되고 "경험 추가하기"로 경험 카드 화면에 갈 수 있다
