"use client";
// 이메일 가입 (specs/account FR-ACCT-01). The confirmation link returns through /auth/confirm, then the consent step.
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn } from "@/components/lg/ui";

export function SignUpForm({ className, oauth, ...props }: React.ComponentPropsWithoutRef<"div"> & { oauth?: React.ReactNode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("비밀번호는 8자 이상이어야 해요.");
    if (password !== repeatPassword) return setError("비밀번호가 서로 달라요.");
    setIsLoading(true);
    try {
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/consent?next=/explore` },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch {
      setError("가입하지 못했어요. 이미 가입한 이메일인지 확인해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-container border border-border p-6">
        <h1 className="text-heading-2">가입하기</h1>
        <p className="mt-1 text-support">{oauth ? "구글 계정이나 이메일로 가입해요." : "이메일로 인증 링크를 보내 드려요."}</p>
        {oauth && <div className="mt-5">{oauth}</div>}
        <form onSubmit={handleSignUp} className="mt-5 flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">비밀번호 (8자 이상)</Label>
            <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="repeat-password">비밀번호 확인</Label>
            <Input id="repeat-password" type="password" autoComplete="new-password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-label text-text-error">{error}</p>}
          <button type="submit" className={cn(btn.primary, "w-full")} disabled={isLoading}>
            {isLoading ? "가입하는 중…" : "가입하기"}
          </button>
          <p className="text-center text-caption text-text-secondary">
            이미 계정이 있나요?{" "}
            <Link href="/auth/login" className="text-text-primary underline underline-offset-4">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
