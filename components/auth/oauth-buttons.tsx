"use client";
// 간편 로그인 (specs/account FR-ACCT-01). Order: Google -> email -> Kakao (Kakao needs a business app review).
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btn } from "@/components/lg/ui";

export function OAuthButtons({ next = "/explore" }: { next?: string }) {
  const [err, setErr] = useState<string | null>(null);
  async function google() {
    setErr(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setErr("구글 로그인을 시작하지 못했어요."); // FR-ACCT-01 E1
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={google} className={`${btn.outline} w-full`}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zm-5.6-8a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9zM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" />
        </svg>
        구글로 계속하기
      </button>
      {err && <p role="alert" className="text-label text-text-error">{err}</p>}
      <p className="text-center text-caption text-text-secondary">또는 이메일로</p>
    </div>
  );
}
