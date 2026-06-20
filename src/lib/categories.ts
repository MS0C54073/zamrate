import {
  Wifi, Banknote, Stethoscope, Bus, Sparkles, GraduationCap,
  UtensilsCrossed, ShieldCheck, HardHat, ShoppingCart, Zap, Sprout,
  Scale, LayoutGrid, type LucideIcon,
} from "lucide-react";

export const CATEGORIES: { name: string; short: string; icon: LucideIcon }[] = [
  { name: "Banks and Financial Institutions", short: "Banks", icon: Banknote },
  { name: "Internet Providers", short: "Telcos", icon: Wifi },
  { name: "Hospitals and Healthcare", short: "Health", icon: Stethoscope },
  { name: "Schools and Education", short: "Education", icon: GraduationCap },
  { name: "Retail and FMCG", short: "Retail", icon: ShoppingCart },
  { name: "Energy and Utilities", short: "Energy", icon: Zap },
  { name: "Transport and Logistics", short: "Transport", icon: Bus },
  { name: "Restaurants and Food Services", short: "Food", icon: UtensilsCrossed },
  { name: "Insurance", short: "Insurance", icon: ShieldCheck },
  { name: "Construction and Engineering", short: "Construction", icon: HardHat },
  { name: "Cleaning and Facility Services", short: "Cleaning", icon: Sparkles },
  { name: "Agriculture and Industrial", short: "Agriculture", icon: Sprout },
  { name: "Legal and Professional Services", short: "Legal", icon: Scale },
];

export const ALL_CATEGORY = { name: "All Sectors", short: "All", icon: LayoutGrid };

export function iconFor(category: string): LucideIcon {
  return CATEGORIES.find((c) => c.name === category)?.icon ?? LayoutGrid;
}
