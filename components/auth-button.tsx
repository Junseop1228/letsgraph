import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-3">
      <Link href="/manage?tab=usage" className="text-label text-text-secondary hover:text-text-primary">{String(user.email ?? "내 계정")}</Link>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Link href="/auth/login" className={cn(btn.secondary, btn.sm)}>로그인</Link>
      <Link href="/auth/sign-up" className={cn(btn.primary, btn.sm)}>가입하기</Link>
    </div>
  );
}
