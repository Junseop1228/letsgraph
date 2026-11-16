// Scenario names follow specs/data-pipeline/spec.md (기준표 ② 직무 × 산업 관련도).
import { describe, expect, it } from "vitest";
import { JOB_ROLES } from "@/lib/data/fixtures";
import { INDUSTRIES } from "@/lib/reference/industry-map";
import { JOB_INDUSTRY, industriesForJob } from "@/lib/reference/job-industry";

const order = INDUSTRIES.map((i) => i.id);

describe("직무 × 산업 관련도 표", () => {
  it("모든 직무가 표에 있고, 모든 산업 ID가 기준표에 있다", () => {
    for (const j of JOB_ROLES) expect(JOB_INDUSTRY[j.id], j.id).toBeDefined();
    const ids = new Set(order);
    for (const rel of Object.values(JOB_INDUSTRY)) for (const id of Object.keys(rel)) expect(ids.has(id), id).toBe(true);
  });

  it("직무마다 관련 산업이 하나 이상이고, 핵심 산업이 먼저 나온다", () => {
    for (const j of JOB_ROLES) {
      const list = industriesForJob(j.id, order);
      expect(list.length, j.id).toBeGreaterThan(0);
      const firstCommon = list.findIndex((x) => x.relevance === 1);
      if (firstCommon >= 0) expect(list.slice(firstCommon).every((x) => x.relevance === 1)).toBe(true);
    }
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
