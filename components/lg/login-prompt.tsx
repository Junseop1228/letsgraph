// 로그인 안내 (specs/account, 2026-11-18): what signed-out visitors see instead of personal pages. Personal data is never
// shown to them, not even demo data; the 탐색 map and company pages stay open without an account.
import Link from "next/link";
import { LogIn } from "lucide-react";
import { btn } from "@/components/lg/ui";

export function LoginPrompt({ title, text, next }: { title: string; text: string; next: string }) {
  const q = `?next=${encodeURIComponent(next)}`;
  // one sentence per line, each balanced: a centred paragraph that wraps mid-phrase is hard to read (design pass 2026-11-18)
  const lines = text.split(/(?<=[.?!])\s+/);
  return (
    <div className="mx-auto max-w-reading-max px-5 py-16">
      <section className="space-y-4 rounded-container bg-bg-sunken p-8 text-center" aria-labelledby="login-prompt-title">
        <h1 id="login-prompt-title" className="text-heading-2 break-keep text-balance">
          {title}
        </h1>
        <p className="text-body text-text-secondary break-keep">
          {lines.map((l, i) => (
            <span key={l} className="block text-balance">
              {l}{i < lines.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/auth/login${q}`} className={btn.primary}>
            <LogIn className="size-4" aria-hidden />
            로그인
          </Link>
          <Link href={`/auth/sign-up${q}`} className={btn.secondary}>
            회원가입
          </Link>
        </div>
        <p className="text-caption text-text-secondary">
          직무 지도와 기업 정보는 로그인 없이도 볼 수 있어요.{" "}
          <Link href="/explore/map" className="underline underline-offset-2">
            탐색으로 가기
          </Link>
        </p>
      </section>
    </div>
  );
}
