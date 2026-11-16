// 직군·직무 목록 (D 2026-11-17 JOB TAXONOMY option 가): 2 levels, 직군 -> 직무, named the way new-grad 공채 and
// 캐치 tags name jobs. Each job carries hidden anchors to the national classifications (licence-safe codes + names,
// research-licensing.md S5): KECO 2025 세분류 (한국고용직업분류) and NCS 세분류 (국가직무능력표준). The anchors are the
// mapping key for parsed JDs (public-sector JDs print NCS codes) and are never shown as labels.
// Selection rules: (1) a recruiting unit in 공채 notices, (2) not a near-duplicate of a neighbour (jobs found in every
// industry, like 경영지원, stay separate when their work clearly differs), (3) a 2nd-4th-year student understands the name.
// Existing ids (12 jobs of the first demo) are kept; descriptions are our own plain words.
// Sources of codes: data.go.kr 15154012 (KECO 2025 신·구 연계표), 15153998 (NCS 분류), both 이용허락범위 제한 없음.

export type JobFamilyDef = { id: string; name: string };
export type JobDef = {
  id: string;
  familyId: string;
  name: string;
  description: string;
  /** KECO 2025 세분류 codes (4 digits) */
  keco: string[];
  /** NCS 세분류 codes (8 digits, 대-중-소-세) */
  ncs: string[];
};

export const JOB_FAMILIES: JobFamilyDef[] = [
  { id: "support", name: "경영지원" },
  { id: "sales", name: "영업·마케팅" },
  { id: "production", name: "생산·품질" },
  { id: "purchasing", name: "구매·물류" },
  { id: "rnd", name: "연구개발" },
  { id: "it", name: "IT·데이터" },
  { id: "financial", name: "금융" },
  { id: "content", name: "디자인·콘텐츠" },
];

export const JOBS: JobDef[] = [
  // 경영지원
  { id: "strategy", familyId: "support", name: "경영기획·전략", description: "회사가 어디에 돈과 사람을 쓸지 계획하고, 실적을 보고 방향을 고치는 일이에요.", keco: ["0261", "0221"], ncs: ["02010101", "02010102"] },
  { id: "finance", familyId: "support", name: "재무·회계", description: "회사 돈이 들어오고 나가는 것을 기록하고 계획하는 일이에요.", keco: ["0271", "0272", "0231"], ncs: ["02030101", "02030102", "02030201", "02030202"] },
  { id: "hr", familyId: "support", name: "인사(HR)", description: "사람을 뽑고, 평가하고, 일하기 좋은 제도를 만드는 일이에요.", keco: ["0263", "0222"], ncs: ["02020201", "02020202"] },
  // 영업·마케팅
  { id: "b2b-sales", familyId: "sales", name: "B2B·기술영업", description: "기업 고객에게 제품과 기술을 설명하고 계약까지 이끄는 일이에요.", keco: ["6121", "6132", "6129"], ncs: ["10010101", "20010501"] },
  { id: "sales-mgmt", familyId: "sales", name: "영업관리", description: "거래처별 매출과 재고, 판촉을 챙기는 일이에요.", keco: ["0262", "6139"], ncs: ["10010101"] },
  { id: "overseas-sales", familyId: "sales", name: "해외영업", description: "해외 거래처를 찾아 우리 제품을 팔고, 계약과 납품까지 챙기는 일이에요.", keco: ["6122"], ncs: ["10010102"] },
  { id: "marketing", familyId: "sales", name: "마케팅·PR", description: "누가 왜 살지 정하고, 그 사람에게 알리고, 회사 이야기를 바깥에 전하는 일이에요.", keco: ["0262", "0241", "0242"], ncs: ["02010301", "02010302", "02010201", "02010202"] },
  { id: "merchandising", familyId: "sales", name: "상품기획·MD", description: "어떤 상품을 얼마에, 얼마나 들여와 팔지 정하는 일이에요.", keco: ["0243"], ncs: ["02040301"] },
  // 생산·품질
  { id: "production-mgmt", familyId: "production", name: "생산관리", description: "정해진 날까지, 정한 양을, 정한 비용으로 만들도록 계획하고 챙기는 일이에요.", keco: ["0285"], ncs: ["02040103", "15030201"] },
  { id: "production-eng", familyId: "production", name: "생산기술·공정기술", description: "제품을 더 빠르고 싸고 불량 없이 만들도록 공정과 라인을 설계하고 고치는 일이에요.", keco: ["1511", "1541"], ncs: ["17010201", "17010202"] },
  { id: "semi-process", familyId: "production", name: "반도체 공정기술", description: "웨이퍼 위에 칩을 만드는 공정 조건을 잡고 수율을 올리는 일이에요.", keco: ["1532"], ncs: ["19030601", "19030602"] },
  { id: "quality", familyId: "production", name: "품질관리", description: "제품이 정한 기준에 맞는지 검사하고, 문제가 생기면 원인을 찾아 다시 생기지 않게 막는 일이에요.", keco: ["0285"], ncs: ["02040201", "15040102", "21010111"] },
  { id: "facility", familyId: "production", name: "설비기술", description: "생산 설비가 멈추지 않게 관리하고 더 잘 돌아가게 고치는 일이에요.", keco: ["1511", "1533"], ncs: ["19030603", "17010203"] },
  { id: "ehs", familyId: "production", name: "환경·안전", description: "일하는 사람과 주변 환경이 다치지 않도록 기준을 세우고 현장을 점검하는 일이에요.", keco: ["1557", "1555"], ncs: ["23020101", "23060101", "23060104"] },
  // 구매·물류
  { id: "purchasing", familyId: "purchasing", name: "구매", description: "원료와 자재를 좋은 조건으로 사 오는 일이에요.", keco: ["0284"], ncs: ["02040101", "02040102"] },
  { id: "scm", familyId: "purchasing", name: "SCM", description: "원료부터 배송까지 물건의 흐름을 맞추는 일이에요.", keco: ["0285", "0289"], ncs: ["02040104"] },
  { id: "logistics-trade", familyId: "purchasing", name: "물류·무역", description: "물건을 창고에서 고객까지, 나라와 나라 사이로 옮기고 통관까지 챙기는 일이에요.", keco: ["0281", "0283", "0289"], ncs: ["02040302", "02040301"] },
  // 연구개발
  { id: "circuit-hw", familyId: "rnd", name: "회로·HW 개발", description: "제품 안에 들어가는 전자 회로와 하드웨어를 설계하고 검증하는 일이에요.", keco: ["1533", "1311"], ncs: ["19030201", "19030301", "19030501"] },
  { id: "mech-design", familyId: "rnd", name: "기구·기계 설계", description: "제품과 장비의 모양, 구조, 부품을 설계하고 시험하는 일이에요.", keco: ["1511"], ncs: ["15010101", "15010201", "19030202"] },
  { id: "materials-rnd", familyId: "rnd", name: "소재·화학 연구", description: "배터리, 반도체, 철강 같은 제품에 들어갈 새 소재를 만들고 성능을 시험하는 일이에요.", keco: ["1541", "1521"], ncs: ["17010201", "17020206"] },
  { id: "bio-process", familyId: "rnd", name: "바이오·제약 연구", description: "약과 바이오 제품을 개발하고, 실험실 방법을 공장에서 안정적으로 만들 수 있게 하는 일이에요.", keco: ["1221"], ncs: ["17030301", "17030101"] },
  { id: "food-rnd", familyId: "rnd", name: "식품 R&D", description: "새 제품의 맛과 원료, 만드는 법을 개발하는 일이에요.", keco: ["1571"], ncs: ["21010110"] },
  { id: "construction-eng", familyId: "rnd", name: "건축·토목 엔지니어", description: "건물과 도로, 공장 같은 시설을 설계하고 현장에서 공사를 관리하는 일이에요.", keco: ["1402", "1403"], ncs: ["14010201", "14030101"] },
  // IT·데이터
  { id: "sw-dev", familyId: "it", name: "SW 개발", description: "서비스와 제품에 들어가는 소프트웨어를 만들고 운영하는 일이에요.", keco: ["1331", "1332", "1333"], ncs: ["20010202", "20010201"] },
  { id: "service-planning", familyId: "it", name: "서비스기획·PM", description: "사용자가 겪는 문제를 정하고, 어떤 기능을 어떤 순서로 만들지 정해 개발팀과 끝까지 챙기는 일이에요.", keco: ["1339", "0261"], ncs: ["20010103", "20010401"] },
  { id: "data-analysis", familyId: "it", name: "데이터 분석", description: "데이터에서 숫자를 뽑아 무엇이 왜 일어났는지 밝히고, 결정을 돕는 일이에요.", keco: ["1352", "0293"], ncs: ["20010105"] },
  { id: "data-ai-eng", familyId: "it", name: "AI·데이터 엔지니어", description: "데이터가 흐르는 길을 만들고, AI 모델을 서비스에 넣어 돌아가게 하는 일이에요.", keco: ["1351"], ncs: ["20010105", "20010201"] },
  { id: "erp-consulting", familyId: "it", name: "ERP·IT 컨설팅", description: "회사의 일하는 방식을 분석해 ERP 같은 시스템으로 바꾸고 정착시키는 일이에요.", keco: ["1320", "0221"], ncs: ["20010102"] },
  // 금융
  { id: "finance-general", familyId: "financial", name: "금융 일반·영업", description: "은행·증권·보험사에서 고객을 만나 상품을 안내하고, 대출과 계약을 심사하는 일이에요.", keco: ["0321", "0322", "0323"], ncs: ["03010303", "03020201"] },
  { id: "investment-risk", familyId: "financial", name: "투자·리스크 분석", description: "기업과 시장을 분석해 투자할 곳을 고르고, 잃을 수 있는 위험을 재는 일이에요.", keco: ["0311", "0312", "0314"], ncs: ["03010503", "03010302", "03010404"] },
  // 디자인·콘텐츠
  { id: "uxui", familyId: "content", name: "UX·UI 디자인", description: "사람이 앱과 제품을 헤매지 않고 쓰도록 화면과 흐름을 설계하는 일이에요.", keco: ["4154", "4155"], ncs: ["20010207", "08020106"] },
  { id: "game-planning", familyId: "content", name: "게임 기획", description: "게임의 규칙, 레벨, 보상, 이야기를 설계하고 숫자를 맞추는 일이에요.", keco: ["4155"], ncs: ["08030105"] },
  { id: "content-pd", familyId: "content", name: "콘텐츠 기획·PD", description: "방송, 영상, 브랜드 콘텐츠를 기획하고 만들어 사람들에게 내보내는 일이에요.", keco: ["4161", "4168", "4172"], ncs: ["08030101", "08030104"] },
];
