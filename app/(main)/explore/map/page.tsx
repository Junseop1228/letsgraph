import { Suspense } from "react";
import { PageSkeleton } from "@/components/lg/page-skeleton";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { catalog, userData } from "@/lib/data";
import { JobMap } from "@/components/explore/job-map";
import type { BusinessSegment } from "@/lib/contracts/domain";

export const metadata = { title: "직무 맵 · LetsGraph" };

async function JobMapPageContent({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const sp = await searchParams;
  const jar = await cookies();
  const jobId = sp.job ?? jar.get("lg_job")?.value ?? "quality";
  const repo = await catalog();
  const job = await repo.jobRole(jobId);
  if (!job) notFound();

  const [families, roles, industries, companies, links, { repo: user }] = await Promise.all([
    repo.jobFamilies(),
    repo.jobRoles(),
    repo.industries(),
    repo.companies(),
    repo.jobLinks(jobId),
    userData(),
  ]);
  const linkCounts = Object.fromEntries(await Promise.all(roles.map(async (r) => [r.id, (await repo.jobLinks(r.id)).length] as const)));
  const segmentsByCompany: Record<string, BusinessSegment[]> = Object.fromEntries(
    await Promise.all(links.map(async (l) => [l.companyId, await repo.segments(l.companyId)] as const)),
  );
  const watchedInitial = await user.watchedCompanyIds();

  return (
    <JobMap
      job={job}
      families={families}
      roles={roles}
      linkCounts={linkCounts}
      industries={industries}
      companies={companies}
      links={links}
      segmentsByCompany={segmentsByCompany}
      watchedInitial={watchedInitial}
    />
  );
}

export default function JobMapPage(props: { searchParams: Promise<{ job?: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JobMapPageContent {...props} />
    </Suspense>
  );
}
