// Scenario names follow specs/data-pipeline/spec.md (FR-OPS-01 기준표 검수).
import { describe, expect, it } from "vitest";
import { INDUSTRIES, KSIC_RULES, industryForKsic } from "@/lib/reference/industry-map";
import { INDUSTRY_OVERRIDES } from "@/lib/reference/industry-overrides";
import { industryForCompany } from "@/lib/reference/classify";

describe("업종 코드 → 산업 기준표", () => {
  it("가장 긴 접두어 규칙이 이긴다", () => {
    expect(industryForKsic("20423").industryId).toBe("cosmetics");
    expect(industryForKsic("20411").industryId).toBe("chemicals");
    expect(industryForKsic("26111").industryId).toBe("semiconductor");
    expect(industryForKsic("29271").industryId).toBe("semiconductor");
    expect(industryForKsic("29272").industryId).toBe("electronics");
    expect(industryForKsic("26211").industryId).toBe("electronics");
    expect(industryForKsic("28202").industryId).toBe("battery");
    expect(industryForKsic("58212").industryId).toBe("game");
    expect(industryForKsic("58221").industryId).toBe("it");
    expect(industryForKsic("64992").industryId).toBe("holding");
    expect(industryForKsic("64121").industryId).toBe("finance");
    expect(industryForKsic("108").industryId).toBe("food");
    expect(industryForKsic("4632").industryId).toBe("food");
    expect(industryForKsic("70113").industryId).toBe("bio-pharma");
    expect(industryForKsic("70129").industryId).toBe("services");
    expect(industryForKsic("72121").industryId).toBe("construction");
  });

  it("유리·세라믹은 소재, 시멘트는 건설, 연료 도소매는 에너지, 타이어는 자동차로 간다", () => {
    expect(industryForKsic("2312").industryId).toBe("chemicals");
    expect(industryForKsic("23311").industryId).toBe("construction");
    expect(industryForKsic("46713").industryId).toBe("energy");
    expect(industryForKsic("47711").industryId).toBe("energy");
    expect(industryForKsic("22110").industryId).toBe("automotive");
  });

  it("더 세부 규칙으로 갈리는 짧은 코드는 검수 필요로 표시한다", () => {
    expect(industryForKsic("204")).toMatchObject({ industryId: "chemicals", ambiguous: true });
    expect(industryForKsic("29")).toMatchObject({ industryId: "machinery", ambiguous: true });
    expect(industryForKsic("261")).toMatchObject({ industryId: "semiconductor", ambiguous: false });
    expect(industryForKsic("21100")).toMatchObject({ industryId: "bio-pharma", ambiguous: false });
  });

  it("코드가 없거나 형식이 다르면 산업을 정하지 않는다", () => {
    expect(industryForKsic("").industryId).toBeNull();
    expect(industryForKsic(null).industryId).toBeNull();
    expect(industryForKsic("ABC").industryId).toBeNull();
  });

  it("모든 규칙과 기업별 지정은 정의된 산업을 가리킨다", () => {
    const ids = new Set(INDUSTRIES.map((i) => i.id));
    for (const v of Object.values(KSIC_RULES)) expect(ids.has(v)).toBe(true);
    for (const o of Object.values(INDUSTRY_OVERRIDES)) if (o.industryId !== null) expect(ids.has(o.industryId)).toBe(true);
    for (const k of Object.keys(INDUSTRY_OVERRIDES)) expect(k).toMatch(/^\d{8}$/);
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(18);
    expect(INDUSTRIES.length).toBeLessThanOrEqual(24);
  });

  it("기업별 지정이 업종 코드 규칙보다 먼저다", () => {
    const [corp, o] = Object.entries(INDUSTRY_OVERRIDES).find(([, v]) => v.industryId !== null)!;
    expect(industryForCompany(corp, "99999")).toMatchObject({ industryId: o.industryId, source: "override", excluded: false });
    expect(industryForCompany("00000000", "20423")).toMatchObject({ industryId: "cosmetics", source: "rule" });
    expect(industryForCompany(null, null)).toMatchObject({ industryId: null, source: "none" });
    const excluded = Object.entries(INDUSTRY_OVERRIDES).find(([, v]) => v.industryId === null);
    if (excluded) expect(industryForCompany(excluded[0], "64992")).toMatchObject({ excluded: true, industryId: null });
  });

  it("이름이 '…홀딩스·…지주'면 지주회사, '…금융지주'면 금융이다", () => {
    expect(industryForCompany("00000000", "14111", "한세예스24홀딩스")).toMatchObject({ industryId: "holding", source: "name" });
    expect(industryForCompany("00000000", "64992", "가나다금융지주")).toMatchObject({ industryId: "finance", source: "name" });
    expect(industryForCompany("00000000", "64992", "롯데지주")).toMatchObject({ industryId: "holding", source: "name" });
    expect(industryForCompany("00000000", "14111", "한섬")).toMatchObject({ industryId: "fashion-living", source: "rule" });
  });
});
