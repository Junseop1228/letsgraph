// Industry pictograms (decisions 2026-11-15: icon vertices). Lucide (ISC). Never shown without the industry name.
import { createElement, type CSSProperties } from "react";
import { Car, Cpu, Factory, FlaskConical, SprayCan, Truck, UtensilsCrossed, type LucideIcon } from "lucide-react";

const INDUSTRY_ICON: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  "bio-pharma": FlaskConical,
  cosmetics: SprayCan,
  auto: Car,
  semi: Cpu,
  logistics: Truck,
};

export function IndustryIcon({ id, className, style, strokeWidth = 1.75 }: { id: string; className?: string; style?: CSSProperties; strokeWidth?: number }) {
  return createElement(INDUSTRY_ICON[id] ?? Factory, { className, style, strokeWidth, "aria-hidden": true });
}
