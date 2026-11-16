import Link from "next/link";
import { Suspense } from "react";
import { AuthLogo } from "@/components/auth/auth-logo";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

// 로그인 오류 (audit 2026-11-16 A-4: was "Sorry, something went wrong. Code error: ..." in English).
// /auth/callback and /auth/confirm send ?error=<Supabase message or code>; map it to one Korean sentence and a way out.
type SP = { error?: string; error_code?: string };

function explain(raw: string): { text: string; expired: boolean } {
  const m = raw.toLowerCase();
  if (m.includes("expired") || m.includes("invalid") || m.includes("otp") || m.includes("token")) {
    return { text: "인증 링크가 만료됐거나 이미 쓴 링크예요. 메일을 다시 받아 주세요.", expired: true };
  }
  if (m.includes("access_denied") || m.includes("denied") || m.includes("cancel")) return { text: "로그인을 취소했거나 권한을 받지 못했어요. 다시 시도해 주세요.", expired: false };
  if (m.includes("no_code")) return { text: "로그인 정보를 받지 못했어요. 처음부터 다시 로그인해 주세요.", expired: false };
  return { text: "로그인 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", expired: false };
}

async function ErrorContent({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const raw = sp?.error_code ?? sp?.error ?? "";
  const { text, expired } = explain(raw);
  return (
    <>
      <p className="mt-1 text-support">{text}</p>
      <Link href="/auth/login" className={cn(btn.primary, "mt-5 w-full")}>다시 로그인하기</Link>
      {expired && (
        <p className="mt-3 text-caption text-text-secondary">
          가입 중이었다면 <Link href="/auth/sign-up" className="text-text-primary underline underline-offset-4">다시 가입하기</Link>, 비밀번호를 바꾸던 중이었다면{" "}
          <Link href="/auth/forgot-password" className="text-text-primary underline underline-offset-4">비밀번호 찾기</Link>에서 메일을 다시 받아요.
        </p>
      )}
      {raw && <p className="mt-4 text-caption text-text-secondary">오류 내용: {raw.slice(0, 120)}</p>}
    </>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
      <AuthLogo />
      <div className="w-full max-w-96">
        <div className="rounded-container border border-border p-6">
          <h1 className="text-heading-2">문제가 생겼어요</h1>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
