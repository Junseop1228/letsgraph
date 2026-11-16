// 기준표 ① 업종 코드 → 서비스 산업 (specs/data-pipeline FR-OPS-01; D 2026-11-17 D1).
// Claude draft of 2026-11-17 from the KSIC 10th revision names (한국표준산업분류, 통계청 고시): ~20 industries, more later.
// DART gives each company one KSIC code (induty_code) of 2-5 digits; the longest rule that is a prefix of it wins.
// Nothing here is shown to users on its own: a person reviews the assignment per company (industry_reviewed) first.
//
// Ids are the English identifiers used in the DB (industries.id); names are the Korean names shown in the UI.
// Classification principles (D 2026-11-17): 1) a company sits where a job seeker would look for it (main business,
// value chain such as 반도체·2차전지 소부장), the KSIC code is only the starting point; 2) pure group holding companies
// form their own industry, financial holding companies are finance, operating companies coded as holdings follow
// their business; 3) checks go to what users see first: large companies and coarse codes; the long tail keeps the
// rule default. Per-company exceptions live in industry-overrides.ts (combined in classify.ts).

export type IndustryDef = { id: string; name: string };

/** Display order. food / bio-pharma / cosmetics keep the ids already in the DB. */
export const INDUSTRIES: IndustryDef[] = [
  { id: "semiconductor", name: "반도체" },
  { id: "electronics", name: "전자·전기" },
  { id: "battery", name: "2차전지" },
  { id: "automotive", name: "자동차" },
  { id: "shipbuilding-aerospace", name: "조선·항공·방산" },
  { id: "machinery", name: "기계·장비" },
  { id: "chemicals", name: "화학·소재" },
  { id: "steel", name: "철강·금속" },
  { id: "energy", name: "에너지·환경" },
  { id: "construction", name: "건설·부동산" },
  { id: "bio-pharma", name: "바이오·제약" },
  { id: "food", name: "식품" },
  { id: "cosmetics", name: "화장품" },
  { id: "fashion-living", name: "패션·생활용품" },
  { id: "retail", name: "유통·무역" },
  { id: "logistics", name: "운송·물류" },
  { id: "it", name: "IT·소프트웨어·통신" },
  { id: "game", name: "게임" },
  { id: "media", name: "미디어·엔터" },
  { id: "finance", name: "금융" },
  { id: "holding", name: "지주회사" },
  { id: "services", name: "서비스·교육" },
];

/** KSIC code prefix -> industry id. The longest prefix of a company's code wins. */
export const KSIC_RULES: Record<string, string> = {
  // 농림어업, 식료품·음료·담배, 식품 도매
  "01": "food",
  "02": "food",
  "03": "food",
  "10": "food",
  "11": "food",
  "12": "food",
  "463": "food",
  // 광업, 석유정제, 전기·가스, 수도·하수·폐기물·환경
  "05": "energy",
  "06": "energy",
  "07": "energy",
  "08": "energy",
  "19": "energy",
  "35": "energy",
  "36": "energy",
  "37": "energy",
  "38": "energy",
  "39": "energy",
  // 섬유·의복·가죽, 목재·종이·인쇄, 가구·기타 제품
  "13": "fashion-living",
  "14": "fashion-living",
  "15": "fashion-living",
  "16": "fashion-living",
  "17": "fashion-living",
  "18": "fashion-living",
  "32": "fashion-living",
  "33": "fashion-living",
  // 화학·고무·플라스틱 (화장품 제외)
  "20": "chemicals",
  "22": "chemicals",
  "20423": "cosmetics",
  "46443": "cosmetics",
  // 의약품, 의료기기, 의학·생물 연구개발, 보건, 의약품·의료용품 도매
  "21": "bio-pharma",
  "271": "bio-pharma",
  "701": "bio-pharma", // 자연과학·공학 연구개발: listed filers here are mostly bio ventures (공학 R&D split below)
  "7011": "bio-pharma",
  "7012": "services",
  "86": "bio-pharma",
  "46441": "bio-pharma",
  "46442": "bio-pharma",
  // 비금속 광물: 유리·세라믹·내화물은 소재, 시멘트·레미콘·아스팔트는 건설; 건설, 부동산
  "23": "chemicals",
  "233": "construction",
  "23991": "construction",
  "41": "construction",
  "42": "construction",
  "68": "construction",
  // 1차 금속, 금속 가공 (무기 제외)
  "24": "steel",
  "25": "steel",
  "252": "shipbuilding-aerospace",
  // 반도체, 반도체 장비
  "261": "semiconductor",
  "2927": "semiconductor", // 반도체·디스플레이 장비 (디스플레이 장비 29272 split below)
  "29271": "semiconductor",
  // 전자 부품·컴퓨터·통신·영상기기, 전기장비 (전지 제외), 디스플레이 장비, 전기·전자 연구개발
  "26": "electronics",
  "28": "electronics",
  "29272": "electronics",
  "70121": "electronics",
  "282": "battery",
  // 정밀기기, 기계·장비, 산업용 기계 수리
  "27": "machinery",
  "29": "machinery",
  "34": "machinery",
  // 자동차·부품, 타이어, 자동차 판매
  "30": "automotive",
  "2211": "automotive",
  "45": "automotive",
  // 선박·철도·항공기·기타 운송장비
  "31": "shipbuilding-aerospace",
  // 도매·소매 (연료 도소매·주유소는 에너지)
  "46": "retail",
  "47": "retail",
  "4671": "energy",
  "477": "energy",
  // 운송·창고
  "49": "logistics",
  "50": "logistics",
  "51": "logistics",
  "52": "logistics",
  // 출판(서적·신문) / 소프트웨어 / 게임 / 통신 / 정보서비스
  "58": "it",
  "581": "media",
  "5821": "game",
  "61": "it",
  "62": "it",
  "63": "it",
  // 영상·오디오, 방송, 광고, 예술·스포츠·오락
  "59": "media",
  "60": "media",
  "713": "media",
  "90": "media",
  "91": "media",
  // 금융·보험, 지주회사·회사 본부
  "64": "finance",
  "65": "finance",
  "66": "finance",
  "649": "holding", // 기타 금융업 without detail: the listed filers here are holding companies
  "6491": "finance",
  "6499": "finance",
  "64992": "holding",
  "715": "holding", // 회사 본부 및 경영 컨설팅: filers here are holding companies (consulting split below)
  "7153": "services",
  // 숙박·음식, 연구개발·전문·사업지원·임대, 공공·교육·복지·단체·개인 서비스
  "55": "services",
  "56": "services",
  "70": "services",
  "71": "services",
  "72": "services",
  "721": "construction", // 건축 기술·엔지니어링 (plant / civil engineering firms)
  "73": "services",
  "74": "services",
  "75": "services",
  "76": "services",
  "84": "services",
  "85": "services",
  "87": "services",
  "94": "services",
  "95": "services",
  "96": "services",
  "97": "services",
  "98": "services",
  "99": "services",
};

export type IndustryMatch = {
  industryId: string | null;
  /** the rule (KSIC prefix) that matched */
  rule: string | null;
  /** the code is coarser than a rule that would split it (e.g. "204" vs 화장품 "20423"): a person must look */
  ambiguous: boolean;
};

export function industryForKsic(code: string | null | undefined): IndustryMatch {
  const c = (code ?? "").trim();
  if (!/^\d{2,5}$/.test(c)) return { industryId: null, rule: null, ambiguous: false };
  let rule: string | null = null;
  for (const k of Object.keys(KSIC_RULES)) if (c.startsWith(k) && (!rule || k.length > rule.length)) rule = k;
  const industryId = rule ? KSIC_RULES[rule] : null;
  const ambiguous = Object.keys(KSIC_RULES).some((k) => k.length > c.length && k.startsWith(c) && KSIC_RULES[k] !== industryId);
  return { industryId, rule, ambiguous };
}
