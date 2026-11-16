// Scenario names follow specs/data-pipeline/spec.md (직무 목록, 기준표 ② 직무 × 산업 관련도).
import { describe, expect, it } from "vitest";
import { JOB_ROLES } from "@/lib/data/fixtures";
import { INDUSTRIES } from "@/lib/reference/industry-map";
import { JOB_FAMILIES, JOBS } from "@/lib/reference/jobs";
import { JOB_INDUSTRY, industriesForJob } from "@/lib/reference/job-industry";

const order = INDUSTRIES.map((i) => i.id);

describe("직무 목록", () => {
  it("직군 6~8개, 직무 30~40개이고 ID가 겹치지 않는다", () => {
    expect(JOB_FAMILIES.length).toBeGreaterThanOrEqual(6);
    expect(JOB_FAMILIES.length).toBeLessThanOrEqual(8);
    expect(JOBS.length).toBeGreaterThanOrEqual(30);
    expect(JOBS.length).toBeLessThanOrEqual(40);
    expect(new Set(JOBS.map((j) => j.id)).size).toBe(JOBS.length);
  });

  it("모든 직무가 정의된 직군에 있고, 국가 분류 코드가 형식에 맞는다", () => {
    const fams = new Set(JOB_FAMILIES.map((f) => f.id));
    for (const j of JOBS) {
      expect(fams.has(j.familyId), j.id).toBe(true);
      expect(j.keco.length + j.ncs.length, j.id).toBeGreaterThan(0);
      for (const c of j.keco) expect(c, j.id).toMatch(/^\d{4}$/);
      for (const c of j.ncs) expect(c, j.id).toMatch(/^\d{8}$/);
      expect(j.description.length, j.id).toBeGreaterThan(10);
    }
    for (const f of JOB_FAMILIES) expect(JOBS.some((j) => j.familyId === f.id), f.id).toBe(true);
  });

  it("처음 데모의 직무 12개는 같은 ID로 남아 있다", () => {
    const ids = new Set(JOBS.map((j) => j.id));
    for (const j of JOB_ROLES) expect(ids.has(j.id), j.id).toBe(true);
  });
});

describe("직무 × 산업 관련도 표", () => {
  it("모든 직무가 표에 있고, 모든 산업 ID가 기준표에 있다", () => {
    for (const j of JOBS) expect(JOB_INDUSTRY[j.id], j.id).toBeDefined();
    for (const id of Object.keys(JOB_INDUSTRY)) expect(JOBS.some((j) => j.id === id), id).toBe(true);
    const ids = new Set(order);
    for (const rel of Object.values(JOB_INDUSTRY)) for (const id of Object.keys(rel)) expect(ids.has(id), id).toBe(true);
  });

  it("직무마다 핵심 산업이 하나 이상이고, 핵심 산업이 먼저 나온다", () => {
    for (const j of JOBS) {
      const list = industriesForJob(j.id, order);
      expect(list[0]?.relevance, j.id).toBe(2);
      const firstCommon = list.findIndex((x) => x.relevance === 1);
      if (firstCommon >= 0) expect(list.slice(firstCommon).every((x) => x.relevance === 1)).toBe(true);
    }
  });

  it("모든 산업은 적어도 한 직무의 핵심 산업이다", () => {
    for (const ind of order) expect(JOBS.some((j) => JOB_INDUSTRY[j.id][ind] === 2), ind).toBe(true);
  });

  it("품질관리는 제조 산업이 핵심이고 금융·게임과는 관련이 없다", () => {
    const q = industriesForJob("quality", order);
    expect(q.find((x) => x.industryId === "food")?.relevance).toBe(2);
    expect(q.find((x) => x.industryId === "semiconductor")?.relevance).toBe(2);
    expect(q.some((x) => x.industryId === "finance" || x.industryId === "game")).toBe(false);
  });

  it("표에 없는 직무는 관련 산업이 없다", () => {
    expect(industriesForJob("no-such-job", order)).toEqual([]);
  });
});
