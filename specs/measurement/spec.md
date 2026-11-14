# 측정 (measurement)

근거: SRS v1.0 FR-OPS-04 · 확정 스택 PostHog (posthog-js, Apache-2.0 AND MIT) · 코드: `lib/client/analytics.tsx`

## Requirements

### Requirement: FR-OPS-04 이용 기록
시스템은 핵심 행동(`CoreAction`) 완료를 기록하되, 개인정보(이메일, 파일 이름, 사용자가 쓴 글)는 보내지 않고, 측정 전송이 실패해도 서비스 이용에는 영향을 주지 않아야 한다(SHALL). 키(`NEXT_PUBLIC_POSTHOG_KEY`)가 없으면 측정은 꺼진다.

핵심 행동 이름(코드와 같은 값): `onboarding_done`, `graph_industry_open`, `company_open`, `posting_analyze`, `connection_view`, `kit_copy`, `kit_download`, `checkout_open`.

> PROPOSED: 위 8개를 깔때기 단계로 쓴다. 지금 연결된 것은 `onboarding_done`, `graph_industry_open`, `kit_copy`, `kit_download`. 화면 기록은 페이지 보기만, 자동 클릭 수집과 세션 녹화는 끈다.

#### Scenario: 키가 없을 때
- **WHEN** 측정 키가 설정되지 않은 상태에서 사용자가 핵심 행동을 하면
- **THEN** 아무것도 전송하지 않고 화면은 평소대로 동작한다

#### Scenario: 전송 실패
- **WHEN** 측정 서버에 닿지 못하면
- **THEN** 오류를 화면에 보이지 않고 사용자의 작업은 계속된다

#### Scenario: 핵심 행동 기록
- **WHEN** 키가 설정된 상태에서 사용자가 Prompt Kit을 복사하면
- **THEN** `kit_copy` 행동 하나가 개인정보 없이 기록된다
