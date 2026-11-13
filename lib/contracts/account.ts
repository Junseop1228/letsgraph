// 첫 로그인 동의 항목 (specs/account FR-ACCT-01). All three are required.
import { z } from "zod";

export const CONSENT_ITEMS = [
  { id: "terms", label: "이용약관에 동의해요", detail: "서비스 이용 규칙이에요." },
  { id: "privacy", label: "개인정보 수집·이용에 동의해요", detail: "이메일, 올린 공고와 포트폴리오에서 정리한 경험 카드를 저장해요. 원본 파일은 저장하지 않고, 탈퇴하면 지워요." },
  { id: "ai", label: "생성형 AI 사용을 확인했어요", detail: "공고 정리, 경험 카드, 연결 결과는 생성형 AI(Google Gemini)가 만들어요. AI가 만든 결과에는 표시가 붙어요." },
] as const;

export const Consent = z.object({ terms: z.literal(true), privacy: z.literal(true), ai: z.literal(true) });
export type Consent = z.infer<typeof Consent>;
