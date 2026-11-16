import Link from "next/link";
import { AuthLogo } from "@/components/auth/auth-logo";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

// 가입 메일 보냄 (audit 2026-11-16 A-3: was the English Supabase template).
export default function Page() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthLogo />
      <div className="w-full max-w-96">
        <div className="rounded-container border border-border p-6">
          <h1 className="text-heading-2">메일을 확인해 주세요</h1>
          <p className="mt-1 text-support">가입 확인 링크를 보냈어요. 링크를 누르면 가입이 끝나고 바로 시작할 수 있어요.</p>
          <p className="mt-3 text-caption text-text-secondary">메일이 안 보이면 스팸함도 확인해 주세요.</p>
          <Link href="/auth/login" className={cn(btn.secondary, "mt-5 w-full")}>로그인 화면으로</Link>
        </div>
      </div>
    </div>
  );
}
