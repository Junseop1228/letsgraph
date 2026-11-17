// A multi-select chip (onboarding cards, the graph's condition panel). Pressed = ink fill with a check.
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { btn } from "@/components/lg/ui";

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={on ? btn.primary : btn.outline}>
      {on && <Check className="size-4" aria-hidden />}
      {children}
    </button>
  );
}
