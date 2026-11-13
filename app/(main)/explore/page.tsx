import { catalog } from "@/lib/data";
import { OnboardingDeck } from "@/components/explore/onboarding-deck";

export const metadata = { title: "탐색 · LetsGraph" };

export default async function ExplorePage() {
  const repo = await catalog();
  const [ids, roles, families] = await Promise.all([repo.onboardingJobIds(), repo.jobRoles(), repo.jobFamilies()]);
  const fam = new Map(families.map((f) => [f.id, f.name]));
  const jobs = ids
    .map((id) => roles.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ ...r, familyName: fam.get(r.groupId) ?? "" }));
  return <OnboardingDeck jobs={jobs} />;
}
