"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function LogoutButton() {
  const router = useRouter();
  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/explore");
    router.refresh();
  };
  return (
    <button type="button" onClick={logout} className={cn(btn.ghost, btn.sm)}>
      로그아웃
    </button>
  );
}
