import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// DESIGN.md type roles, spacing and radius tokens are custom Tailwind theme values that tailwind-merge does not know.
// Without them, a type role (text-label) and a colour (text-on-accent) look like the same group and one is silently
// dropped (2026-11-16: the header 가입하기 button lost its text colour), and h-control-md / h-control-sm both survive.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "display-mobile", "heading-1", "heading-2", "heading-3", "body-lg", "body", "support", "label", "label-strong", "caption", "figure-hero", "figure", "data", "data-sm"],
      spacing: ["hairline", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "margin-mobile", "margin-desktop", "control-sm", "control-md", "control-lg", "touch-min", "row-height", "header-height", "tab-bar-height", "drawer-width", "side-panel-width", "content-max", "reading-max", "floating-card-width"],
      radius: ["inner", "element", "container", "tile", "sheet"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
