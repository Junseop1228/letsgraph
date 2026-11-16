"use client";
// 새 비밀번호 정하기 (audit 2026-11-16 A-2: was the English template and sent users to a /protected page that does not exist).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { btn } from "@/components/lg/ui";
import { cn } from "@/lib/utils";

/** Supabase error text -> one Korean sentence with the way out. */
function message(raw: string): { text: string; again?: boolean } {
  const m = raw.toLowerCase();
  if (m.includes("session")) return { text: "링크가 만료됐어요. 비밀번호 찾기에서 링크를 다시 받아 주세요.", again: true };
  if (m.includes("different") || m.includes("same")) return { text: "지금 쓰는 비밀번호와 다른 비밀번호를 넣어 주세요." };
  if (m.includes("at least") || m.includes("characters")) return { text: "비밀번호는 6자 이상이어야 해요." };
  return { text: "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요." };
}

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ text: string; again?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      router.push("/explore"); // the reset link already signed the user in
    } catch (err: unknown) {
      setError(message(err instanceof Error ? err.message : ""));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-container border border-border p-6">
        <h1 className="text-heading-2">새 비밀번호 정하기</h1>
        <p className="mt-1 text-support">앞으로 로그인할 때 쓸 비밀번호를 넣어 주세요.</p>
        <form onSubmit={handleUpdate} className="mt-5 flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input id="password" type="password" autoComplete="new-password" minLength={6} required aria-describedby="password-hint" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p id="password-hint" className="text-caption text-text-secondary">6자 이상</p>
          </div>
          {error && (
            <p role="alert" className="text-label text-text-error">
              {error.text}{" "}
              {error.again && <Link href="/auth/forgot-password" className="underline underline-offset-4">비밀번호 찾기</Link>}
            </p>
          )}
          <button type="submit" className={cn(btn.primary, "w-full")} disabled={isLoading}>
            {isLoading ? "저장하는 중…" : "새 비밀번호 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}
