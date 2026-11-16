import { Suspense } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { catalog, userData } from "@/lib/data";
import { ExploreGraph } from "@/components/explore/explore-graph";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import type { BusinessSegment } from "@/lib/contracts/domain";

export const metadata = { title: "나의 취업 그래프 · letsGraph" };

type Props = { searchParams: Promise<{ job?: string }> };

// 탐색 > 나의 취업 그래프 (prototype v1.3 graph view; decisions 2026-11-14)
async function GraphContent({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const jobId = sp.job ?? jar.get("lg_job")?.value ?? "quality";
  const repo = await catalog();
  const job = await repo.jobRole(jobId);
  if (!job) notFound();

  const [roles, industries, companies, { repo: user }] = await Promise.all([repo.jobRoles(), repo.industries(), repo.companies(), userData()]);
  const links = (await Promise.all(roles.map((r) => repo.jobLinks(r.id)))).flat();
  const linkedCompanies = [...new Set(links.map((l) => l.companyId))];
  const segmentsByCompany: Record<string, BusinessSegment[]> = Object.fromEntries(
    await Promise.all(linkedCompanies.map(async (id) => [id, await repo.segments(id)] as const)),
  );
  return (
    <ExploreGraph
      roles={roles}
      industries={industries}
      companies={companies}
      links={links}
      segmentsByCompany={segmentsByCompany}
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
