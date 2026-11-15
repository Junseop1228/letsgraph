// Engine spike only (decisions D 2026-11-15 20:56): synthetic worst-case graph for the performance gate in
// research-graph-engine.md §4, opened with /explore/map?stress=150 (&engine=d3 for the old engine).
// 5 stars x 6 industries x N saved companies, every company in every star (max bridges).
import type { Company, Industry, JobLink, JobRole } from "@/lib/contracts/domain";
import { buildGraph, type GraphData } from "@/lib/explore/graph";

export function stressGraph(target: number, vertical: boolean): GraphData {
  const jobsN = 5;
  const indN = 6;
  const perJob = Math.max(1, Math.round((target - jobsN - jobsN * indN) / jobsN));
  const industries = Array.from({ length: indN }, (_, i) => ({ id: `si${i}`, name: `산업 ${i + 1}` })) as unknown as Industry[];
  const companies = Array.from({ length: perJob }, (_, i) => ({ id: `sc${i}`, name: `시험기업 ${i + 1}`, industryId: `si${i % indN}`, revenue: (perJob - i) * 1e11 })) as unknown as Company[];
  const jobs = Array.from({ length: jobsN }, (_, i) => ({ id: `sj${i}`, name: `직무 ${i + 1}` })) as unknown as JobRole[];
  const links = jobs.flatMap((j, k) =>
    companies.map((c, i) => ({ jobRoleId: j.id, companyId: c.id, basis: (i + k) % 3 === 0 ? "estimated" : "posting" })),
  ) as unknown as JobLink[];
  return buildGraph({ jobs, industries, companies, links, saved: companies.map((c) => c.id), expanded: null, vertical });
}
