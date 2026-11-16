import { Suspense } from "react";
import { catalog } from "@/lib/data";
import { OnboardingDeck } from "@/components/explore/onboarding-deck";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { JOBS } from "@/lib/reference/jobs";

export const metadata = { title: "탐색 · letsGraph" };

// 직군 칩 -> 직무 카드 -> 산업 칩 (specs/explore FR-DISC-01, D 2026-11-17 onboarding card flow)
async function ExploreContent() {
  const repo = await catalog();
  const [roles, families, industries, counts] = await Promise.all([
    repo.jobRoles(),
    repo.jobFamilies(),
    repo.industries(),
    repo.industryCompanyCounts(),
  ]);
  const famName = new Map(families.map((f) => [f.id, f.name]));
  const famOrder = new Map(families.map((f, k) => [f.id, k]));
  const jobOrder = new Map(JOBS.map((j, k) => [j.id, k]));
  // grouped by 직군, then in the order of the job list (lib/reference/jobs.ts)
  const jobs = [...roles]
    .sort(
      (a, b) =>
        (famOrder.get(a.groupId) ?? 99) - (famOrder.get(b.groupId) ?? 99) ||
        (jobOrder.get(a.id) ?? 999) - (jobOrder.get(b.id) ?? 999) ||
        a.name.localeCompare(b.name),
    )
    .map((r) => ({ ...r, familyName: famName.get(r.groupId) ?? "" }));
  const usedFamilies = families.filter((f) => jobs.some((j) => j.groupId === f.id));
  const withCompanies = industries
    .map((i) => ({ id: i.id, name: i.name, count: counts[i.id] ?? 0 }))
    .filter((i) => i.count > 0);
  return <OnboardingDeck families={usedFamilies} jobs={jobs} industries={withCompanies} />;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExploreContent />
    </Suspense>
  );
}
