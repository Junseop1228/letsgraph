import { Suspense } from "react";
import { ConsentForm } from "@/components/auth/consent-form";
import { PageSkeleton } from "@/components/lg/page-skeleton";

export const metadata = { title: "시작하기 전에 · LetsGraph" };

type Props = { searchParams: Promise<{ next?: string }> };

async function ConsentContent({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-reading-max space-y-6 px-5 py-16">
      <div>
        <h1 className="text-heading-1">시작하기 전에 확인해 주세요</h1>
        <p className="mt-2 text-body-lg text-text-secondary">처음 한 번만 받아요. 세 가지 모두 동의해야 계정이 만들어져요.</p>
      </div>
      <ConsentForm next={next ?? "/explore"} />
    </div>
  );
}

export default function ConsentPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <ConsentContent {...props} />
    </Suspense>
  );
}
