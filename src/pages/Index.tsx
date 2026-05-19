import { useEffect, useMemo, useState } from "react";
import { Search, Shield, Users, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, ALL_CATEGORY } from "@/lib/categories";
import { CompanyCard } from "@/components/CompanyCard";
import { CompanyDetailDialog } from "@/components/CompanyDetailDialog";
import { SuggestCompanyDialog } from "@/components/SuggestCompanyDialog";
import { Recommendations } from "@/components/Recommendations";
import zamrateIcon from "@/assets/zamrate-icon.png";
import type { Company } from "@/types";

interface RatingAgg { company_id: string; sum: number; count: number; }

export default function Index() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agg, setAgg] = useState<Record<string, RatingAgg>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY.name);
  const [selected, setSelected] = useState<Company | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("public-listings")
      .on("postgres_changes", { event: "*", schema: "public", table: "ratings" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, () => void load())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  async function load() {
    const [{ data: cs }, { data: rs }] = await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("ratings").select("company_id, rating"),
    ]);
    setCompanies((cs ?? []) as Company[]);
    const a: Record<string, RatingAgg> = {};
    (rs ?? []).forEach((r) => {
      const k = r.company_id;
      a[k] = a[k] ?? { company_id: k, sum: 0, count: 0 };
      a[k].sum += r.rating; a[k].count += 1;
    });
    setAgg(a);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (activeCategory !== ALL_CATEGORY.name && c.category !== activeCategory) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.services?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [companies, search, activeCategory]);

  const totalRatings = Object.values(agg).reduce((s, r) => s + r.count, 0);

  function openDetail(c: Company) {
    setSelected(c);
    setDialogOpen(true);
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-accent/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2 shrink-0">
            <img src={zamrateIcon} alt="ZamRate" className="size-10 rounded-xl object-cover shadow-card" />
            <span className="font-display text-xl text-foreground hidden sm:inline">ZamRate</span>
          </a>
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a company, category, or service…"
              className="pl-11 bg-accent/10 border-2 border-transparent focus-visible:border-accent focus-visible:bg-card rounded-2xl h-11"
            />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SuggestCompanyDialog />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-12 sm:pt-16 pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 bg-accent/25 text-clay font-bold text-xs uppercase tracking-widest rounded-full mb-6">
            The People&apos;s Pulse · Zambia
          </span>
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mb-6 text-balance">
            Your voice shapes our <span className="text-primary italic">public services.</span>
          </h1>
          <p className="text-base sm:text-lg text-foreground/70 max-w-[55ch] mx-auto">
            Rate companies and institutions in Zambia. Comment anonymously. Hold service leaders accountable — together.
          </p>
        </div>
      </section>

      {/* Category filters */}
      <section className="px-4 sm:px-6 mb-10">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-2 sm:gap-3">
          {[ALL_CATEGORY, ...CATEGORIES].map((c) => {
            const active = activeCategory === c.name;
            const Icon = c.icon;
            return (
              <button
                key={c.name}
                onClick={() => setActiveCategory(c.name)}
                className={`px-4 sm:px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  active
                    ? "bg-accent text-accent-foreground shadow-card"
                    : "bg-card border border-accent/30 hover:border-accent text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{c.name}</span>
                <span className="sm:hidden">{c.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-end justify-between mb-6 border-b border-accent/20 pb-4">
          <h2 className="font-display text-2xl sm:text-3xl text-clay">
            {activeCategory === ALL_CATEGORY.name ? "All companies" : activeCategory}
          </h2>
          <span className="text-sm text-muted-foreground tabular-nums">{filtered.length} listed</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No companies match your search.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => {
              const a = agg[c.id];
              const avg = a ? a.sum / a.count : 0;
              return (
                <CompanyCard
                  key={c.id}
                  company={c}
                  avg={avg}
                  count={a?.count ?? 0}
                  onView={openDetail}
                  onRate={openDetail}
                />
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 bg-accent/15 rounded-[32px] p-8 sm:p-12">
          <Stat value={totalRatings.toLocaleString()} label="Verified Ratings" />
          <Stat value={companies.length.toString()} label="Service Providers" />
          <Stat value="K0" label="Cost to Citizens" />
        </div>

        {/* About / Privacy */}
        <section id="about" className="mt-20 grid md:grid-cols-3 gap-6">
          <InfoCard icon={<Shield className="size-6" />} title="Privacy first" text="No accounts required. We never publish names, emails, phone numbers or IP addresses." />
          <InfoCard icon={<Users className="size-6" />} title="Fair & balanced" text="One rating per company per person. Up to three edits — then your rating is locked." />
          <InfoCard icon={<Sparkles className="size-6" />} title="Built for Zambia" text="Citizens, not algorithms, decide who deserves applause and who needs to do better." />
        </section>

        <Recommendations />
      </main>

      <footer className="bg-foreground text-background py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="max-w-xs">
            <div className="font-display text-2xl mb-3">ZamRate</div>
            <p className="text-background/60 text-sm">
              Built for the people of Zambia to foster transparency, accountability, and excellence in service delivery.
            </p>
          </div>
          <div className="text-sm text-background/60">
            &copy; {new Date().getFullYear()} ZamRate · Community Guidelines · Privacy
          </div>
        </div>
      </footer>

      <CompanyDetailDialog
        company={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRatingChanged={load}
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-4xl sm:text-5xl text-clay mb-2 tabular-nums">{value}</div>
      <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-foreground/50">{label}</div>
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-card">
      <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-sm text-foreground/65">{text}</p>
    </div>
  );
}
