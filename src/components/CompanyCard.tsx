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

// Known Zambian company → official website domain (for Clearbit logo lookup)
const KNOWN_DOMAINS: Record<string, string> = {
  "zanaco bank": "zanaco.co.zm",
  "zanaco": "zanaco.co.zm",
  "stanbic bank": "stanbicbank.co.zm",
  "stanbic bank zambia": "stanbicbank.co.zm",
  "mtn zambia": "mtn.zm",
  "mtn": "mtn.zm",
  "airtel zambia": "airtel.co.zm",
  "airtel": "airtel.co.zm",
  "absa bank zambia": "absa.co.zm",
  "absa": "absa.co.zm",
  "zesco limited": "zesco.co.zm",
  "zesco": "zesco.co.zm",
  "first national bank": "fnbzambia.co.zm",
  "fnb zambia": "fnbzambia.co.zm",
  "cavmont bank": "cavmont.com.zm",
  "access bank zambia": "accessbankplc.com",
  "bank of zambia": "boz.zm",
  "zambia national commercial bank": "zanaco.co.zm",
  "indo zambia bank": "izb.co.zm",
  "atlas mara": "atlasmara.com",
  "zamtel": "zamtel.zm",
  "liquid intelligent technologies": "liquid.tech",
  "puma energy": "pumaenergy.com",
  "shoprite": "shoprite.co.za",
  "pick n pay": "pnp.co.za",
  "game stores": "game.co.za",
};

function domainFromWebsite(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function logoDomain(company: Company): string | null {
  const key = company.name.trim().toLowerCase();
  return KNOWN_DOMAINS[key] ?? domainFromWebsite(company.website);
}

export function CompanyCard({ company, avg, count, onView, onRate }: Props) {
  const Icon = iconFor(company.category);
  const domain = logoDomain(company);
  const logoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!logoUrl && !logoFailed;
  return (
    <article className="bg-card rounded-2xl p-5 shadow-card border border-border/60 flex flex-col hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
      <button onClick={() => onView(company)} className="flex flex-col items-center text-center group">
        <div className="h-16 w-full flex items-center justify-center mb-3 relative">
          {showLogo ? (
            <div className="size-16 rounded-2xl bg-card border border-border/60 flex items-center justify-center overflow-hidden p-2">
              <img
                src={logoUrl!}
                alt={`${company.name} logo`}
                className="max-h-full max-w-full object-contain"
                onError={() => setLogoFailed(true)}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center relative">
              <span className="font-display font-bold text-primary text-lg">{initials(company.name)}</span>
              <span className="absolute -bottom-1.5 -right-1.5 size-7 rounded-full bg-card border border-border flex items-center justify-center text-primary">
                <Icon className="size-3.5" />
              </span>
            </div>
          )}
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
