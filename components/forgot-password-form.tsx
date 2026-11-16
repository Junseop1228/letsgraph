"use client";
// 비밀번호 찾기 (audit 2026-11-16 A-1: was the English Supabase template). Same card as the login form.
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // The redirect URL must be listed in Supabase > Auth > URL configuration.
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch {
      setError("링크를 보내지 못했어요. 이메일 주소를 확인하고 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-container border border-border p-6">
        {success ? (
          <>
            <h1 className="text-heading-2">메일을 확인해 주세요</h1>
            <p className="mt-1 text-support">이메일로 가입한 계정이면 비밀번호를 바꿀 수 있는 링크가 도착해요. 메일이 안 보이면 스팸함도 확인해 주세요.</p>
            <Link href="/auth/login" className={cn(btn.secondary, "mt-5 w-full")}>로그인으로 돌아가기</Link>
          </>
        ) : (
          <>
            <h1 className="text-heading-2">비밀번호 찾기</h1>
            <p className="mt-1 text-support">가입한 이메일을 넣으면 비밀번호를 바꿀 수 있는 링크를 보내 드려요.</p>
            <form onSubmit={handleForgotPassword} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <p role="alert" className="text-label text-text-error">{error}</p>}
              <button type="submit" className={cn(btn.primary, "w-full")} disabled={isLoading}>
                {isLoading ? "보내는 중…" : "재설정 링크 보내기"}
              </button>
              <p className="text-center text-caption text-text-secondary">
                비밀번호가 생각났나요?{" "}
                <Link href="/auth/login" className="text-text-primary underline underline-offset-4">로그인</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
