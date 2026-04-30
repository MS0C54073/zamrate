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

export function CompanyCard({ company, avg, count, onView, onRate }: Props) {
  const Icon = iconFor(company.category);
  return (
    <article className="bg-card rounded-3xl p-6 sm:p-7 shadow-card border border-border/60 flex flex-col hover:shadow-card-hover transition-all">
      <div className="flex justify-between items-start mb-5">
        <div className="size-14 bg-secondary rounded-2xl flex items-center justify-center text-clay">
          <Icon className="size-7" />
        </div>
        <div className="bg-accent/20 px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="text-clay font-bold tabular-nums text-sm">
            {avg ? avg.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-clay/70">/ 5</span>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {company.category}
        </span>
        <h3 className="font-display text-xl sm:text-2xl mt-1 leading-tight">{company.name}</h3>
      </div>

      <p className="text-foreground/60 text-sm leading-relaxed mb-5 line-clamp-2">
        {company.description || company.services}
      </p>

      <div className="flex items-center gap-2 mb-5">
        <StarRating value={avg} readOnly size={16} />
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "rating" : "ratings"}
        </span>
      </div>

      <div className="mt-auto flex gap-2">
        <Button variant="secondary" className="flex-1 rounded-xl" onClick={() => onView(company)}>
          View Details
        </Button>
        <Button className="flex-1 rounded-xl bg-primary hover:bg-clay text-primary-foreground" onClick={() => onRate(company)}>
          Rate Now
        </Button>
      </div>
    </article>
  );
}
