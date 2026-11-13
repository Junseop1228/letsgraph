"use client";
// 이메일 로그인 (specs/account FR-ACCT-01). After login: first-time users go to the consent step, others back to `next`.
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { btn } from "@/components/lg/ui";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const nextRaw = params.get("next") ?? "/explore";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/explore";

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
      router.push(profile ? next : `/auth/consent?next=${encodeURIComponent(next)}`);
    } catch {
      setError("이메일이나 비밀번호가 맞지 않아요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-container border border-border p-6">
        <h1 className="text-heading-2">로그인</h1>
        <p className="mt-1 text-support">관심 기업, 공고, 경험 카드를 저장하려면 로그인해요.</p>
        <form onSubmit={handleLogin} className="mt-5 flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">비밀번호</Label>
              <Link href="/auth/forgot-password" className="ml-auto text-caption text-text-secondary underline-offset-4 hover:underline">
                비밀번호를 잊었어요
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-label text-text-error">{error}</p>}
          <button type="submit" className={cn(btn.primary, "w-full")} disabled={isLoading}>
            {isLoading ? "로그인하는 중…" : "로그인"}
          </button>
          <p className="text-center text-caption text-text-secondary">
            계정이 없나요?{" "}
            <Link href="/auth/sign-up" className="text-text-primary underline underline-offset-4">
              가입하기
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
