import Image from "next/image";
import Link from "next/link";

/** Auth pages sit outside the app header, so the logo on top is the way back into the app (audit L-1). */
export function AuthLogo() {
  return (
    <Link href="/explore" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-heading-3">
      <Image src="/brand/logo-mark.png" alt="" width={32} height={32} className="size-8 dark:hidden" />
      <Image src="/brand/logo-mark-dark.png" alt="" width={32} height={32} className="hidden size-8 dark:block" />
      letsGraph
    </Link>
  );
}
