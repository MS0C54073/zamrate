import { useState } from "react";
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

// Known Zambian company → official website domain (used for favicon resolution)
const KNOWN_DOMAINS: Record<string, string> = {
  // Banks & Financial
  "absa bank zambia": "absa.co.zm",
  "access bank zambia": "zambia.accessbankplc.com",
  "bank of zambia": "boz.zm",
  "cavmont bank": "cavmont.com.zm",
  "first capital bank zambia": "firstcapitalbank.co.zm",
  "first national bank": "fnbzambia.co.zm",
  "fnb zambia": "fnbzambia.co.zm",
  "indo zambia bank": "izb.co.zm",
  "stanbic bank": "stanbicbank.co.zm",
  "stanbic bank zambia": "stanbicbank.co.zm",
  "zanaco": "zanaco.co.zm",
  "zanaco bank": "zanaco.co.zm",
  "zambia national commercial bank": "zanaco.co.zm",
  "atlas mara": "zambia.accessbankplc.com",
  "ecobank zambia": "ecobank.com",
  "investrust bank": "investrustbank.co.zm",
  "zambia industrial commercial bank": "zicb.co.zm",
  "zicb": "zicb.co.zm",
  // Internet / Telcos
  "airtel": "airtel.co.zm",
  "airtel zambia": "airtel.co.zm",
  "mtn": "mtn.zm",
  "mtn zambia": "mtn.zm",
  "zamtel": "zamtel.zm",
  "liquid intelligent technologies": "liquid.tech",
  "liquid intelligent technologies zambia": "liquid.tech",
  "starlink zambia": "starlink.com",
  "paratus zambia": "paratus.africa",
  "iconnect zambia": "iconnect.zm",
  // Energy & Utilities
  "zesco": "zesco.co.zm",
  "zesco limited": "zesco.co.zm",
  "zesco ltd": "zesco.co.zm",
  "copperbelt energy corporation": "cec.com.zm",
  "cec": "cec.com.zm",
  "puma energy": "pumaenergy.com",
  "totalenergies zambia": "totalenergies.co.zm",
  "mount meru petroleum": "mountmerugroup.com",
  // Retail & FMCG
  "shoprite": "shoprite.co.za",
  "shoprite zambia": "shoprite.co.za",
  "pick n pay": "pnp.co.za",
  "pick n pay zambia": "pnp.co.za",
  "game stores": "game.co.za",
  "zambeef products plc": "zambeefplc.com",
  "zambeef": "zambeefplc.com",
  "choppies zambia": "choppies.co.bw",
  "spar zambia": "spar.co.za",
  // Restaurants & Food
  "hungry lion zambia": "hungrylion.co.za",
  "hungry lion": "hungrylion.co.za",
  "rhapsody's zambia": "rhapsodys.co.za",
  "food fayre": "foodfayre.com",
  "mint lounge lusaka": "mintloungelusaka.com",
  "kfc zambia": "kfc.co.za",
  "debonairs pizza zambia": "debonairspizza.co.za",
  "steers zambia": "steers.co.za",
  // Hospitals & Healthcare
  "coptic hospital": "coptichospital.org.zm",
  "fairview hospital": "ihzfairview.com",
  "medland hospital": "medlandhospital.com",
  "university teaching hospital": "uth.gov.zm",
  "care for business medical clinic": "cfb.co.zm",
  "psl zambia": "pslzambia.com",
  // Insurance
  "hollard zambia": "hollard.co.zm",
  "madison general insurance": "madison.co.zm",
  "sanlam zambia": "sanlam.co.zm",
  "professional insurance corporation zambia": "picz.co.zm",
  "prudential zambia": "prudential.co.zm",
  // Schools & Education
  "university of zambia": "unza.zm",
  "unza": "unza.zm",
  "copperbelt university": "cbu.ac.zm",
  "cbu": "cbu.ac.zm",
  "international school of lusaka": "isl.edu.zm",
  "lusaka apex medical university": "lamu.edu.zm",
  "noah's ark school": "noahsarkschool.co.zm",
  "zambia qualifications authority": "zaqa.gov.zm",
  "mulungushi university": "mu.ac.zm",
  // Transport & Logistics
  "yango zambia": "yango.com",
  "yango": "yango.com",
  "ulendo taxi and delivery services": "ulendo.app",
  "ulendo": "ulendo.app",
  "power tools bus services": "powertools.co.zm",
  "ubz": "ubz.co.zm",
  "zambia railways": "zrl.com.zm",
  "proflight zambia": "proflight-zambia.com",
  // Construction & Engineering
  "avic international zambia": "avic-intl.cn",
  "datong construction zambia": "datongconstruction.com",
  "stefanutti stocks zambia": "stefanuttistocks.com",
  // Agriculture & Industrial
  "etg cure chem zambia": "etgworld.com",
  "saro agro industrial ltd": "saroafrica.com",
  "zambia fertilizer company": "zambiafertilizers.com",
  "seed co zambia": "seedcogroup.com",
  // Cleaning & Facility / Legal / Professional
  "clean care zambia": "cleancare.co.zm",
  "fresh start cleaning services": "freshstart.co.zm",
  "sparkle cleaning zambia": "sparkle.co.zm",
  "mint master security zambia ltd": "mintmastersecurity.com",
  "sucar": "sucar.co.zm",
  "am hlazo and co": "amhlazo.com",
  "corpus globe corporate services": "corpusglobe.com",
  "mulenga mundashi legal practitioners": "mmco.co.zm",
  // Additional mappings
  "zambia sugar plc": "zambiasugar.com",
  "zamnet": "zamnet.zm",
  "zoran café": "zorancafe.com",
  "zoran cafe": "zorancafe.com",
  "zsic": "zsic.co.zm",
  "zsic general insurance": "zsicgi.co.zm",
  "zsic life": "zsiclife.co.zm",
  // Newly added
  "zamnet communication systems": "zamnet.zm",
  "prudential life assurance zambia": "prudential.co.zm",
  "atlas mara zambia": "zambia.accessbankplc.com",
  "puma energy zambia": "pumaenergy.com",
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

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

function logoProxyUrl(domain: string): string | null {
  if (!SUPABASE_PROJECT_ID) return null;
  return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/company-logo?domain=${encodeURIComponent(domain)}`;
}

export function CompanyCard({ company, avg, count, onView, onRate }: Props) {
  const Icon = iconFor(company.category);
  const domain = logoDomain(company);
  const logoUrl = company.logo_url || (domain ? logoProxyUrl(domain) : null);
  const [logoOk, setLogoOk] = useState(true);
  const showLogo = !!logoUrl && logoOk;
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
                onError={() => setLogoOk(false)}
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
