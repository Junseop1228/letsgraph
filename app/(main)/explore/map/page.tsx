import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { catalog, userData } from "@/lib/data";
import { ExploreGraph } from "@/components/explore/explore-graph";
import { loadGraph } from "@/lib/explore/load";
import { JOB_COOKIE, readIndustryChoice } from "@/lib/onboarding";
import { PageSkeleton } from "@/components/lg/page-skeleton";

export const metadata = { title: "나의 취업 그래프 · letsGraph" };

type Props = { searchParams: Promise<{ job?: string }> };

// 탐색 > 나의 취업 그래프 (prototype v1.3 graph view; decisions 2026-11-14)
async function GraphContent({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const jobId = sp.job ?? jar.get(JOB_COOKIE)?.value ?? "quality";
  const repo = await catalog();
  const job = await repo.jobRole(jobId);
  if (!job) notFound();

  // every job card can become a star, so the slice covers all jobs (top N per industry keeps it small);
  // industries picked on the onboarding card narrow every star (none picked = each job's closest industries)
  const chosen = readIndustryChoice((n) => jar.get(n)?.value);
  const [roles, { repo: user }] = await Promise.all([repo.jobRoles(), userData()]);
  const g = await loadGraph(repo, roles.map((r) => r.id), chosen);
  return (
    <ExploreGraph
      roles={roles}
      industries={g.industries}
      industryTotals={g.industryTotals}
      companies={g.companies}
      links={g.links}
      segmentsByCompany={g.segmentsByCompany}
      watchedInitial={await user.watchedCompanyIds()}
      initialJob={job.id}
    />
  );
}

export default function GraphPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GraphContent {...props} />
    </Suspense>
  );
}
