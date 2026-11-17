// 데모 지원 근거 (specs/connection FR-PREM-02): the demo posting's conditions with recommended cards, so the demo shows
// 자격 요건 and 우대 사항 too. Fictional, labelled as demo on screen.
import type { EvidencePoint } from "@/lib/contracts/activity";

export const DEMO_EVIDENCE: EvidencePoint[] = [
  { requirement: "도전", kind: "competency", cardType: "none", strength: "none", reason: "", next: "익숙하지 않은 일에 먼저 나서 본 장면이 있으면 만들기에서 꺼내 보세요." },
  { requirement: "주도성", kind: "competency", cardType: "episode", cardId: "exp-stock", cardTitle: "재고 폐기 줄이기", strength: "strong", reason: "폐기가 잦은 문제를 먼저 찾고, 요일별 판매 기록을 정리해 발주량 조정을 이끈 장면이에요." },
  { requirement: "데이터 분석", kind: "competency", cardType: "activity", cardId: "act-contest", cardTitle: "교내 데이터 분석 공모전", strength: "medium", reason: "서울시 상권 공공 데이터를 전처리해 분석 보고서를 낸 활동이에요. 검사 데이터에서 기준을 벗어난 값을 찾는 일과 이어져요.", missing: "품질·검사 데이터를 직접 다룬 경험은 아니에요." },
  { requirement: "문제해결", kind: "competency", cardType: "episode", cardId: "exp-bug", cardTitle: "백엔드 장애 대응", strength: "medium", reason: "오류 원인을 좁히고 복구 순서를 문서로 남긴 장면이 클레임 원인 분석과 재발 방지 업무와 이어져요.", missing: "식품·제조 현장의 문제는 아니에요." },
  { requirement: "4년제 학사 이상 (졸업 예정자 포함)", kind: "qualification", cardType: "none", strength: "none", reason: "", next: "지원 자격을 먼저 확인해 보세요." },
  { requirement: "식품·화학·생명·산업공학 등 관련 전공", kind: "qualification", cardType: "none", strength: "none", reason: "", next: "전공이 지원 자격에 맞는지 먼저 확인해 보세요." },
  { requirement: "식품기사, 품질경영기사 등 관련 자격", kind: "preferred", cardType: "none", strength: "none", reason: "", next: "가진 자격증이 있으면 지원서 자격 칸에 적어요. 지원 자격을 먼저 확인해 보세요." },
  { requirement: "엑셀로 검사 데이터를 다뤄 본 경험", kind: "preferred", cardType: "episode", cardId: "exp-stock", cardTitle: "재고 폐기 줄이기", strength: "medium", reason: "요일별 판매 기록을 엑셀로 정리해 발주량을 정한 장면이에요.", missing: "검사 데이터가 아니라 판매 기록이에요." },
  { requirement: "교대 근무가 있는 사업장 근무 가능자", kind: "preferred", cardType: "activity", cardId: "act-cafe", cardTitle: "카페 아르바이트", strength: "weak", reason: "주 4회 마감 근무를 맡은 활동이에요.", missing: "교대 근무 경험은 아니에요.", next: "근무 가능 여부는 지원서에 직접 밝히고, 지원 자격과 함께 확인해 보세요." },
];
