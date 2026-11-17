// 관리자 메뉴 (specs/data-pipeline FR-OPS-04): a header link only admins see (ADMIN_EMAILS, checked on the server).
import Link from "next/link";
import { currentAdmin } from "@/lib/auth/admin";

export async function AdminLink() {
  const admin = await currentAdmin();
  if (!admin) return null;
  return (
    <Link
      href="/admin/company-jobs"
      className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-element px-2 text-label-strong text-text-secondary transition-colors hover:bg-overlay-hover hover:text-text-primary sm:px-3.5"
    >
      관리자
    </Link>
  );
}
