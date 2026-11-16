import Link from "next/link";
import { UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

/** Profile icon -> 내 계정 (teammate header spec). Rendered exactly once in the header. */
export function AccountLink({ title, className }: { title?: string; className?: string }) {
  return (
    <Link href="/account" aria-label="내 계정" title={title} className={cn("flex size-10 shrink-0 items-center justify-center rounded-element hover:bg-overlay-hover", className)}>
      <UserRound className="size-5" aria-hidden />
    </Link>
  );
}

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Logged in: profile icon + 로그아웃 (the e-mail text link duplicated the icon, audit C-5).
  return user ? (
    <div className="flex shrink-0 items-center gap-1">
      <AccountLink title={String(user.email ?? "")} />
      <LogoutButton />
    </div>
  ) : (
    <div className="flex shrink-0 items-center gap-2">
      {/* the demo account page stays one click away; below sm the header only has room for 로그인 (audit C-1) */}
      <AccountLink className="hidden sm:flex" />
      <Link href="/auth/login" className={cn(btn.secondary, btn.sm, "whitespace-nowrap")}>로그인</Link>
      {/* sign-up stays one tap away on the login page */}
      <Link href="/auth/sign-up" className={cn(btn.primary, btn.sm, "hidden whitespace-nowrap sm:inline-flex")}>가입하기</Link>
    </div>
  );
}
