import {
  Wifi, Banknote, Stethoscope, Bus, Sparkles, GraduationCap,
  UtensilsCrossed, ShieldCheck, HardHat, ShoppingCart, Zap, Sprout,
  Scale, LayoutGrid, type LucideIcon,
} from "lucide-react";

export const CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: "Internet Providers", icon: Wifi },
  { name: "Banks and Financial Institutions", icon: Banknote },
  { name: "Hospitals and Healthcare", icon: Stethoscope },
  { name: "Transport and Logistics", icon: Bus },
  { name: "Cleaning and Facility Services", icon: Sparkles },
  { name: "Schools and Education", icon: GraduationCap },
  { name: "Restaurants and Food Services", icon: UtensilsCrossed },
  { name: "Insurance", icon: ShieldCheck },
  { name: "Construction and Engineering", icon: HardHat },
  { name: "Retail and FMCG", icon: ShoppingCart },
  { name: "Energy and Utilities", icon: Zap },
  { name: "Agriculture and Industrial", icon: Sprout },
  { name: "Legal and Professional Services", icon: Scale },
];

export const ALL_CATEGORY = { name: "All Sectors", icon: LayoutGrid };

export function iconFor(category: string): LucideIcon {
  return CATEGORIES.find((c) => c.name === category)?.icon ?? LayoutGrid;
}
