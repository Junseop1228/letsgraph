"use client";
// 테마 버튼 (design/DESIGN.md COL-9): a sun in the coach orange while the page is light, a moon in the logo blue while
// it is dark; a click switches. next-themes puts the "dark" class on <html> before the first paint and keeps the choice
// in the browser. The button holds both icons and both labels and CSS (dark:) shows the right one, so the server never
// needs to know the theme: no flash, no hydration difference, nothing for the instant-navigation check to trip on.
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      title="라이트·다크 바꾸기"
      className="grid size-9 shrink-0 place-items-center rounded-full text-sun transition-colors hover:bg-sun-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none dark:text-moon dark:hover:bg-moon-muted"
    >
      <Sun className="size-5 dark:hidden" strokeWidth={2.25} aria-hidden />
      <Moon className="hidden size-5 dark:block" fill="currentColor" aria-hidden />
      <span className="sr-only dark:hidden">다크 모드로 바꾸기</span>
      <span className="hidden dark:sr-only dark:block">라이트 모드로 바꾸기</span>
    </button>
  );
}
