import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { iconFor } from "@/lib/categories";
import type { Company } from "@/types";

interface Props {
  company: Company;
  avg: number;
  count: number;
  onView: (c: Company) => void;
  onRate: (c: Company) => void;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function domainFromWebsite(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function CompanyCard({ company, avg, count, onView, onRate }: Props) {
  const Icon = iconFor(company.category);
  const domain = domainFromWebsite(company.website);
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;
  return (
    <article className="bg-card rounded-2xl p-5 shadow-card border border-border/60 flex flex-col hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
      <button onClick={() => onView(company)} className="flex flex-col items-center text-center group">
        <div className="h-16 w-full flex items-center justify-center mb-3 relative">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${company.name} logo`}
              className="max-h-14 max-w-[80%] object-contain"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                t.nextElementSibling?.removeAttribute("hidden");
              }}
            />
          ) : null}
          <div
            hidden={!!logoUrl}
            className="size-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center relative"
          >
            <span className="font-display font-bold text-primary text-lg">{initials(company.name)}</span>
            <span className="absolute -bottom-1.5 -right-1.5 size-7 rounded-full bg-card border border-border flex items-center justify-center text-primary">
              <Icon className="size-3.5" />
            </span>
          </div>
        </div>
        <h3 className="font-display text-base font-semibold leading-tight group-hover:text-primary transition-colors">
          {company.name}
        </h3>
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-3 mb-4">
        <StarRating value={avg} readOnly size={14} />
        <span className="text-sm font-semibold tabular-nums">{avg ? avg.toFixed(1) : "—"}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>

      <Button
        className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground mt-auto h-9"
        onClick={() => onRate(company)}
      >
        Rate Now
      </Button>
    </article>
  );
}
