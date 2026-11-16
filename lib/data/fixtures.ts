// Demo dataset used when Supabase is not configured (no keys) and for tests.
// Figures: FY2025, 억원, from company disclosures/IR as recorded in ../context/demo-data-food-2025.md.
// Values without a disclosed figure are null and render as "수치 연결 전".
import type {
  BusinessSegment,
  Company,
  CompanyDetail,
  Industry,
  JobFamily,
  JobLink,
  JobRole,
  SegmentDetail,
} from "@/lib/contracts/domain";
import type { Activity, Experience, JobPosting, PostingAnalysisOutput, ConnectionOutput } from "@/lib/contracts/activity";

export const INDUSTRIES: Industry[] = [
  { id: "food", name: "식품" },
  { id: "bio-pharma", name: "바이오·제약" },
  { id: "cosmetics", name: "화장품" },
];

export const JOB_FAMILIES: JobFamily[] = [
  { id: "support", name: "경영지원" },
  { id: "production", name: "생산·품질" },
  { id: "rnd", name: "연구개발" },
  { id: "sales", name: "영업·마케팅" },
  { id: "purchasing", name: "구매·물류" },
];

export const JOB_ROLES: JobRole[] = [
  { id: "finance", groupId: "support", name: "재무·회계", description: "회사 돈이 들어오고 나가는 것을 기록하고 계획하는 일이에요." },
  { id: "hr", groupId: "support", name: "인사", description: "사람을 뽑고, 평가하고, 일하기 좋은 제도를 만드는 일이에요." },
  { id: "production-mgmt", groupId: "production", name: "생산관리", description: "정해진 날까지, 정한 양을, 정한 비용으로 만들도록 계획하고 챙기는 일이에요." },
  { id: "quality", groupId: "production", name: "품질관리", description: "제품이 정한 기준에 맞는지 검사하고, 문제가 생기면 원인을 찾아 다시 생기지 않게 막는 일이에요." },
  { id: "facility", groupId: "production", name: "설비·공정", description: "생산 설비가 멈추지 않게 관리하고 공정을 개선하는 일이에요." },
  { id: "food-rnd", groupId: "rnd", name: "식품 R&D", description: "새 제품의 맛과 원료, 만드는 법을 개발하는 일이에요." },
  { id: "bio-process", groupId: "rnd", name: "바이오 공정개발", description: "미생물 발효 같은 생산 공정을 더 싸고 안정적으로 만드는 일이에요." },
  { id: "sales-mgmt", groupId: "sales", name: "영업관리", description: "거래처별 매출과 재고, 판촉을 챙기는 일이에요." },
  { id: "overseas-sales", groupId: "sales", name: "해외영업", description: "해외 거래처를 찾아 우리 제품을 팔고, 계약과 납품까지 챙기는 일이에요." },
  { id: "marketing", groupId: "sales", name: "마케팅", description: "누가 왜 살지 정하고, 그 사람에게 알리는 일이에요." },
  { id: "purchasing", groupId: "purchasing", name: "구매", description: "원료와 자재를 좋은 조건으로 사 오는 일이에요." },
  { id: "scm", groupId: "purchasing", name: "SCM", description: "원료부터 배송까지 물건의 흐름을 맞추는 일이에요." },
];

/** Onboarding deck order (specs/explore FR-DISC-01) */
export const ONBOARDING_JOB_IDS = ["quality", "production-mgmt", "overseas-sales", "marketing", "scm", "finance"];

const DISCLOSURE_2025 = { kind: "filing" as const, label: "2025 영업(잠정)실적 공시", date: "2026-02-09" };

export const COMPANIES: Company[] = [
  { id: "cj", name: "CJ제일제당", industryId: "food", revenue: 177549, operatingIncome: 8612, fiscalYear: 2025, basisNote: "대한통운 제외", source: DISCLOSURE_2025, hasDetail: true },
  { id: "nongshim", name: "농심", industryId: "food", revenue: null, operatingIncome: null, fiscalYear: null, hasDetail: false },
  { id: "ottogi", name: "오뚜기", industryId: "food", revenue: null, operatingIncome: null, fiscalYear: null, hasDetail: false },
  { id: "orion", name: "오리온", industryId: "food", revenue: 33324, operatingIncome: 5582, fiscalYear: 2025, basisNote: "연결", source: { kind: "filing", label: "2025 연결 실적 공시", date: "2026-02-05" }, hasDetail: false },
  { id: "samyang", name: "삼양식품", industryId: "food", revenue: 23518, operatingIncome: 5239, fiscalYear: 2025, basisNote: "연결", source: { kind: "ir", label: "2025 연결 실적" }, hasDetail: false },
  { id: "dongwon", name: "동원산업", industryId: "food", revenue: 95837, operatingIncome: 5156, fiscalYear: 2025, basisNote: "연결 · 동원F&B 포함", source: { kind: "filing", label: "2025 연결 잠정실적 공시", date: "2026-02-11" }, hasDetail: false },
  { id: "daesang", name: "대상", industryId: "food", revenue: null, operatingIncome: null, fiscalYear: null, hasDetail: false },
  { id: "cjfresh", name: "CJ프레시웨이", industryId: "food", revenue: 34811, operatingIncome: 1017, fiscalYear: 2025, basisNote: "식자재 유통·단체급식", source: { kind: "ir", label: "2025 실적 보도자료", date: "2026-02-05" }, hasDetail: false },
  { id: "celltrion", name: "셀트리온", industryId: "bio-pharma", revenue: 41163, operatingIncome: 11655, fiscalYear: 2025, basisNote: "연결 · 회사 실적 전망 공시 기준", source: { kind: "estimate", label: "2025 연간 실적 전망 공시" }, hasDetail: false },
  { id: "sbl", name: "삼성바이오로직스", industryId: "bio-pharma", revenue: null, operatingIncome: null, fiscalYear: null, hasDetail: false },
  { id: "amore", name: "아모레퍼시픽", industryId: "cosmetics", revenue: null, operatingIncome: null, fiscalYear: null, hasDetail: false },
  { id: "kolmar", name: "한국콜마", industryId: "cosmetics", revenue: null, operatingIncome: null, fiscalYear: null, hasDetail: false },
];

const L = (jobRoleId: string, basis: "posting" | "estimated", ids: string[]): JobLink[] =>
  ids.map((companyId) => ({ jobRoleId, companyId, basis }));

/** OPEN (specs/data-pipeline): real link basis. Demo links follow prototype v3. */
export const JOB_LINKS: JobLink[] = [
  ...L("quality", "posting", ["cj", "nongshim", "ottogi"]),
  ...L("quality", "estimated", ["orion", "samyang", "dongwon", "daesang", "cjfresh", "celltrion", "sbl", "amore", "kolmar"]),
  ...L("production-mgmt", "estimated", ["cj", "nongshim", "ottogi", "orion", "samyang", "dongwon", "daesang", "celltrion", "sbl", "kolmar"]),
  ...L("overseas-sales", "posting", ["samyang"]),
  ...L("overseas-sales", "estimated", ["orion", "cj", "nongshim", "dongwon", "celltrion", "amore", "kolmar"]),
];

export const SEGMENTS: BusinessSegment[] = [
  { id: "cj-food", companyId: "cj", name: "식품사업부문", shortName: "식품", revenue: 115221, operatingIncome: 5255, calculated: false, summary: "곡물을 들여와 가공식품과 소재식품을 만들어 국내외에 팔아요.", jobRoleIds: ["quality", "production-mgmt", "overseas-sales"] },
  { id: "cj-bio", companyId: "cj", name: "바이오사업부문", shortName: "바이오", revenue: 39594, operatingIncome: 2034, calculated: false, summary: "원당 같은 원료를 발효해 아미노산과 조미소재를 만들어 세계 사료·식품 회사에 팔아요.", jobRoleIds: ["quality", "production-mgmt", "overseas-sales"] },
  { id: "cj-etc", companyId: "cj", name: "그 외 (F&C 등)", shortName: "그 외", revenue: 22734, operatingIncome: 1323, calculated: true, summary: "전체에서 식품과 바이오를 뺀 나머지예요.", jobRoleIds: [] },
];

const IR_FOOD = { kind: "ai" as const, label: "CJ제일제당 IR(2024년 4분기 경영실적 발표, 2025.02.11)과 2025 실적 발표(2026.02.09)를 AI가 요약", date: "2026-02-09" };

export const SEGMENT_DETAILS: SegmentDetail[] = [
  {
    segmentId: "cj-food",
    flow: [
      { key: "원재료", title: "곡물과 원료", detail: "쌀·원맥·원당·대두·옥수수 등을 국내외에서 사 와요" },
      { key: "주요 제품", title: "가공식품 · 소재식품", detail: "햇반·만두·김치 같은 가공식품과 설탕·밀가루·식용유 같은 소재" },
      { key: "판매 채널", title: "국내 유통 · 해외", detail: "마트·온라인·B2B(식자재, 급식). 해외는 미주 중심에 유럽·호주 확대" },
      { key: "매출 · FY2025", title: "매출", detail: "해외 5조 9,247억 · 국내 5조 5,974억", figure: 115221 },
    ],
    flowSource: IR_FOOD,
    trend: [
      { year: 2023, revenue: 112644, operatingIncome: 6546 },
      { year: 2024, revenue: 113530, operatingIncome: 6201 },
      { year: 2025, revenue: 115221, operatingIncome: 5255, revenueChangeReported: 1.5, operatingIncomeChangeReported: -15.3 },
    ],
    trendSource: { kind: "ir", label: "2023·2024 = 2024년 4분기 경영실적 발표 IR 분기 합계, 2025 = 영업(잠정)실적 공시", date: "2026-02-09" },
    jobNotes: {
      quality: ["원료 입고 검사부터 완제품 출하까지 정한 기준을 지켜요", "HACCP 같은 식품안전 기준을 운영하고 점검에 대응해요", "해외로 파는 제품은 나라별 표시·규격 기준도 확인해요"],
      "production-mgmt": ["국내외 공장의 생산 계획과 실적을 챙겨요", "원가와 수율을 관리하고 개선 과제를 실행해요"],
      "overseas-sales": ["미주·유럽·호주 유통사와 입점·판촉을 협의해요", "나라별 판매 계획과 재고를 맞춰요"],
    },
    examplePostingId: "demo-cj-quality",
    updates: [
      { tag: "식품", title: "해외 식품 매출이 처음으로 국내를 넘었다고 발표", date: "2026-02-09", kind: "release", sourceLabel: "실적 발표" },
      { tag: "식품", title: "식품사업부문 영업이익 5,255억 원, 전년보다 15.3% 감소", date: "2026-02-09", kind: "disclosure", sourceLabel: "공시" },
      { tag: "식품", title: "헝가리 만두·치킨 공장 2026년 하반기 가동 계획", date: "2025-02-11", kind: "ir", sourceLabel: "IR 자료" },
    ],
    newsQuery: "CJ제일제당 식품",
  },
  {
    segmentId: "cj-bio",
    flow: [
      { key: "원재료", title: "발효 원료", detail: "원당·옥수수 같은 당을 미생물로 발효해요" },
      { key: "주요 제품", title: "아미노산 · 조미소재", detail: "라이신·트립토판 같은 사료용 아미노산과 핵산 같은 조미소재" },
      { key: "판매 채널", title: "세계 B2B 고객", detail: "사료·식품 회사에 팔아요. 미국·중국·인도네시아 등 해외 공장에서 만들어요" },
      { key: "매출 · FY2025", title: "매출", detail: "전년 대비 ▼ −5.4%", figure: 39594 },
    ],
    flowSource: { kind: "ai", label: "CJ제일제당 IR(2024년 4분기 경영실적 발표)과 공시·보도(2025.04 ~ 2026.02)를 AI가 요약", date: "2026-02-09" },
    trend: [
      { year: 2023, revenue: 41343, operatingIncome: 2513 },
      { year: 2024, revenue: 42095, operatingIncome: 3376 },
      { year: 2025, revenue: 39594, operatingIncome: 2034, revenueChangeReported: -5.4, operatingIncomeChangeReported: -36.7 },
    ],
    trendSource: { kind: "ir", label: "2023·2024 = 2024년 4분기 IR 분기 합계(BIO·FNT 통합 기준), 2025 = 실적 발표. 2025 증감률은 회사가 재분류한 2024 기준", date: "2026-02-09" },
    jobNotes: {
      quality: ["발효로 만든 아미노산의 순도·함량 같은 규격을 검사해요", "사료·식품 고객사가 요구하는 품질 인증 서류를 관리해요", "여러 나라 공장이 같은 기준을 지키는지 확인해요"],
      "production-mgmt": ["발효 공장의 생산량과 가동률을 계획해요", "원료 가격 변화에 맞춰 원가를 관리해요"],
      "overseas-sales": ["유럽·미주 사료 회사와 아미노산 공급 계약을 맺어요", "관세와 판가 변화에 맞춰 지역별 판매를 조정해요"],
    },
    updates: [
      { tag: "바이오", title: "바이오사업부문 매출 3조 9,594억 원(▼ −5.4%), 영업이익 2,034억 원(▼ −36.7%)", date: "2026-02-09", kind: "release", sourceLabel: "실적 발표" },
      { tag: "바이오", title: "바이오사업부 매각 계획이 없다고 공시", date: "2025-04-30", kind: "disclosure", sourceLabel: "DART" },
    ],
    newsQuery: "CJ제일제당 바이오",
  },
];

export const COMPANY_DETAILS: CompanyDetail[] = [
  {
    companyId: "cj",
    trend: [
      { year: 2021, revenue: 157444, operatingIncome: 11787 },
      { year: 2022, revenue: 187794, operatingIncome: 12682 },
      { year: 2023, revenue: 178904, operatingIncome: 8195 },
      { year: 2024, revenue: 178710, operatingIncome: 10323 },
      { year: 2025, revenue: 177549, operatingIncome: 8612, revenueChangeReported: -0.6, operatingIncomeChangeReported: -15.2 },
    ],
    trendSource: { kind: "filing", label: "연도별 실적 발표(대한통운 제외), 2025 = 영업(잠정)실적 공시", date: "2026-02-09" },
    updates: [
      { tag: "전사", title: "연결재무제표 기준 영업(잠정)실적 공시", date: "2026-02-09", kind: "disclosure", sourceLabel: "DART" },
      { tag: "식품", title: "해외 식품 매출이 처음으로 국내를 넘었다고 발표", date: "2026-02-09", kind: "release", sourceLabel: "실적 발표" },
      { tag: "전사", title: "사료·축산 법인(CJ피드앤케어) 매각 계약 체결", date: "2025-10-01", kind: "disclosure", sourceLabel: "DART" },
      { tag: "바이오", title: "바이오사업부 매각 계획이 없다고 공시", date: "2025-04-30", kind: "disclosure", sourceLabel: "DART" },
    ],
    newsQuery: "CJ제일제당",
  },
];

/** Demo posting: an example, not a real recruitment notice (labelled "데모용 예시 공고" in the UI). */
export const DEMO_POSTINGS: JobPosting[] = [
  { id: "demo-cj-quality", companyId: "cj", companyName: "CJ제일제당", segmentId: "cj-food", title: "품질관리 신입", jobRoleId: "quality", deadline: "2026-11-24", status: "interested", source: "demo" },
  { id: "demo-nongshim-quality", companyId: "nongshim", companyName: "농심", title: "품질관리", jobRoleId: "quality", deadline: "2026-11-28", status: "interested", source: "demo" },
  { id: "demo-orion-sales", companyId: "orion", companyName: "오리온", title: "영업관리", jobRoleId: "sales-mgmt", deadline: "2026-11-17", status: "applied", source: "demo" },
  { id: "demo-cjfresh-md", companyId: "cjfresh", companyName: "CJ프레시웨이", title: "MD", deadline: "2026-11-13", status: "interview", source: "demo" },
  { id: "demo-samyang-overseas", companyId: "samyang", companyName: "삼양식품", title: "해외영업", jobRoleId: "overseas-sales", deadline: null, deadlineNote: "채용 시 마감", status: "interested", source: "demo" },
];

export const DEMO_ANALYSES: Record<string, PostingAnalysisOutput> = {
  "demo-cj-quality": {
    companyName: "CJ제일제당",
    title: "품질관리 신입",
    deadline: "2026-11-24",
    duties: ["원료 입고 검사와 공정·완제품 품질 검사", "HACCP 등 식품안전 기준 운영과 점검 대응", "고객 불만(클레임) 원인 분석과 재발 방지"],
    qualifications: ["4년제 학사 이상 (졸업 예정자 포함)", "식품·화학·생명·산업공학 등 관련 전공"],
    preferred: ["식품기사, 품질경영기사 등 관련 자격", "엑셀로 검사 데이터를 다뤄 본 경험", "교대 근무가 있는 사업장 근무 가능자"],
    competencies: [
      { name: "도전", basis: "stated", evidence: "인재상과 자기소개서 문항에 명시" },
      { name: "주도성", basis: "stated", evidence: "인재상과 자기소개서 문항에 명시" },
      { name: "데이터 분석", basis: "inferred", evidence: "검사 데이터를 다루는 주요 업무와 우대 사항에서 추론" },
      { name: "문제해결", basis: "inferred", evidence: "클레임 원인 분석과 재발 방지 업무에서 추론" },
    ],
    cautions: ["자기소개서 1번에 희망 근무지(공장)를 꼭 적어야 해요."],
  },
};

export const DEMO_ACTIVITIES: Activity[] = [
  { id: "act-app", title: "동아리 앱 개발 프로젝트", kind: "club", period: "2025.03 ~ 2025.12", role: "백엔드와 일정 관리", summary: "동아리원 5명이 학사 일정 알림 앱을 만들어 출시했어요.", sourceLabel: "경험 대화" },
  { id: "act-cafe", title: "카페 아르바이트", kind: "parttime", period: "2024.06 ~ 2025.02", role: "마감 담당", dataset: "요일별 판매·폐기 기록 8개월치, 직접 정리한 엑셀", summary: "동네 카페에서 주 4회 마감과 발주를 맡았어요.", sourceLabel: "경험 대화" },
  { id: "act-contest", title: "교내 데이터 분석 공모전", kind: "contest", period: "2025.09 ~ 2025.11", role: "데이터 전처리", dataset: "서울시 상권 공공 데이터, 공개 데이터", summary: "4명이 공공 데이터로 상권 분석 보고서를 냈어요.", sourceLabel: "포트폴리오.pdf", scenes: [
    { title: "결측값 처리 기준 정하기", hint: "공공 데이터의 결측값 처리 기준을 팀에 제안했다고 적혀 있어요." },
    { title: "상권 지도 시각화", hint: "분석 결과를 상권 지도로 시각화해 보고서에 넣었다고 적혀 있어요." },
  ] },
];

export const DEMO_EXPERIENCES: Experience[] = [
  { id: "exp-sched", activityId: "act-app", theme: "problem", title: "일정 지연 대응", kind: "club", period: "2025.03 ~ 2025.12", situation: "출시 2주 전 일정이 3주 밀렸어요.", action: "필수 기능 중심으로 일정을 다시 짰어요.", result: "필수 기능으로 출시했어요.", competencies: ["리더십", "일정관리"], sourceLabel: "동아리 앱 개발 프로젝트" },
  { id: "exp-bug", activityId: "act-app", theme: "problem", title: "백엔드 장애 대응", kind: "club", period: "2025.03 ~ 2025.12", situation: "출시 직후 로그인 오류가 났어요.", action: "오류를 먼저 발견하고 원인을 좁혀 복구 순서를 문서로 만들었어요.", result: "같은 오류가 다시 나지 않게 대응 절차가 남았어요.", competencies: ["주도성", "문제해결"], sourceLabel: "동아리 앱 개발 프로젝트" },
  { id: "exp-stock", activityId: "act-cafe", theme: "problem", title: "재고 폐기 줄이기", kind: "parttime", period: "2024.06 ~ 2025.02", situation: "마감 후 우유와 디저트 폐기가 잦았어요.", role: "마감 담당으로 재고 기록을 맡았어요.", action: "요일별 판매 기록을 엑셀로 정리해 발주량을 조정했어요.", result: "폐기가 줄었어요. 정확한 수치는 직접 확인해서 넣어요.", learning: "감보다 기록이 설득력이 있다는 걸 배웠어요.", chatLog: [
    { role: "assistant", text: "'카페 아르바이트'에서 에피소드를 꺼내 볼게요. 아래 추천 에피소드에서 고르거나, 테마를 고르거나, 떠오르는 장면을 바로 말해 주세요." },
    { role: "user", text: "문제 해결·직무 역량: '재고 폐기 줄이기' 장면으로 할게요." },
    { role: "assistant", text: "그 장면에서 처음에 어떤 문제가 있었나요?" },
    { role: "user", text: "마감 후 우유랑 디저트 폐기가 너무 많았어요." },
    { role: "assistant", text: "문제를 풀려고 직접 한 행동을 순서대로 말해 줄래요?" },
    { role: "user", text: "요일별 판매 기록을 엑셀로 정리해서 발주량을 바꿨어요." },
  ], competencies: ["분석", "주도성"], sourceLabel: "카페 아르바이트" },
  { id: "exp-manual", activityId: "act-cafe", theme: "collab", title: "단골 응대 매뉴얼", kind: "parttime", period: "2024.06 ~ 2025.02", situation: "새 직원이 자주 받는 요청을 몰랐어요.", action: "자주 받는 요청을 정리해 교육 자료로 만들었어요.", result: "새 직원 교육에 썼어요.", competencies: ["협업", "고객응대"], sourceLabel: "카페 아르바이트" },
  { id: "exp-null", activityId: "act-contest", theme: "collab", title: "결측 데이터 정리", kind: "contest", period: "2025.09 ~ 2025.11", situation: "공모전 데이터에 결측값이 많았어요.", action: "결측값 처리 기준을 팀에 제안하고 전처리를 맡았어요.", result: "팀이 같은 기준으로 분석했어요.", competencies: ["분석", "문제해결"], sourceLabel: "교내 데이터 분석 공모전" },
];

export const DEMO_CONNECTIONS: Record<string, ConnectionOutput> = {
  "demo-cj-quality": {
    links: [
      { competency: "문제해결", experienceId: "exp-bug", experienceTitle: "백엔드 장애 대응", reason: "클레임이 들어오면 원인을 좁혀 가며 재발을 막는 게 품질관리의 일이에요. 오류 원인을 찾고 복구 순서를 문서로 남긴 경험이 맞아요.", context: "주요 업무: 고객 불만 원인 분석과 재발 방지 (예시 공고)." },
      { competency: "주도성", experienceId: "exp-stock", experienceTitle: "재고 폐기 줄이기", reason: "시키지 않은 기준을 스스로 세운 경험이에요. 판매 기록을 정리해 발주량을 바꾼 건, 이익이 줄어드는 시기에 낭비를 줄이는 시각으로 이어져요.", context: "식품사업부문 2025 영업이익 5,255억 원, 전년 대비 ▼ −15.3%." },
    ],
    skills: [
      { competency: "데이터 분석", activityId: "act-contest", activityTitle: "교내 데이터 분석 공모전", reason: "서울시 상권 공공 데이터를 전처리해 분석 보고서를 낸 활동이에요. 품질관리의 검사 데이터에서 기준을 벗어난 값을 찾아내는 일과 이어져요." },
    ],
    gaps: ["도전"],
  },
};

/** Companies saved by the demo user (관심 기업) */
// Visitors start with no saved companies (decisions 2026-11-16, audit C-2): saving one is part of the demo.
export const DEMO_WATCHED: string[] = [];
