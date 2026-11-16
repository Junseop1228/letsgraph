// Industry pictograms (decisions 2026-11-15: icon vertices). Lucide (ISC). Never shown without the industry name.
// One icon per industry of lib/reference/industry-map.ts (22, 2026-11-17).
import { createElement, type CSSProperties } from "react";
import {
  Atom,
  BatteryCharging,
  Building2,
  Car,
  Clapperboard,
  Code,
  Cog,
  Cpu,
  Factory,
  FlaskConical,
  Gamepad2,
  Hammer,
  Handshake,
  Landmark,
  Layers,
  MonitorSmartphone,
  Ship,
  Shirt,
  ShoppingBag,
  SprayCan,
  Truck,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";

const INDUSTRY_ICON: Record<string, LucideIcon> = {
  semiconductor: Cpu,
  electronics: MonitorSmartphone,
  battery: BatteryCharging,
  automotive: Car,
  "shipbuilding-aerospace": Ship,
  machinery: Cog,
  chemicals: Atom,
  steel: Hammer,
  energy: Zap,
  construction: Building2,
  "bio-pharma": FlaskConical,
  food: UtensilsCrossed,
  cosmetics: SprayCan,
  "fashion-living": Shirt,
  retail: ShoppingBag,
  logistics: Truck,
  it: Code,
  game: Gamepad2,
  media: Clapperboard,
  finance: Landmark,
  holding: Layers,
  services: Handshake,
};

export function IndustryIcon({ id, className, style, strokeWidth = 1.75 }: { id: string; className?: string; style?: CSSProperties; strokeWidth?: number }) {
  return createElement(INDUSTRY_ICON[id] ?? Factory, { className, style, strokeWidth, "aria-hidden": true });
}
