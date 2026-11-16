import { Suspense } from "react";
import { catalog } from "@/lib/data";
import { OnboardingDeck } from "@/components/explore/onboarding-deck";
import { PageSkeleton } from "@/components/lg/page-skeleton";

export const metadata = { title: "탐색 · letsGraph" };

async function ExploreContent() {
  const repo = await catalog();
  const [ids, roles, families] = await Promise.all([repo.onboardingJobIds(), repo.jobRoles(), repo.jobFamilies()]);
  const fam = new Map(families.map((f) => [f.id, f.name]));
  const jobs = ids
    .map((id) => roles.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ ...r, familyName: fam.get(r.groupId) ?? "" }));
  return <OnboardingDeck jobs={jobs} />;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExploreContent />
    </Suspense>
  );
}
