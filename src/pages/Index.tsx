import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Shield, Users, BarChart3, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, ALL_CATEGORY } from "@/lib/categories";
import { CompanyCard } from "@/components/CompanyCard";
import { CompanyDetailDialog } from "@/components/CompanyDetailDialog";
import { SuggestCompanyDialog } from "@/components/SuggestCompanyDialog";
import zamrateIcon from "@/assets/zamrate-icon.png";
import type { Company } from "@/types";
import { LiveActivity } from "@/components/LiveActivity";

interface RatingAgg { company_id: string; sum: number; count: number; }

export default function Index() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agg, setAgg] = useState<Record<string, RatingAgg>>({});
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY.name);
  const [selected, setSelected] = useState<Company | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const catRowRef = useRef<HTMLDivElement | null>(null);

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

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    companies.forEach((c) => { m[c.category] = (m[c.category] ?? 0) + 1; });
    return m;
  }, [companies]);

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

  const topRated = useMemo(() => {
    return [...filtered]
      .map((c) => ({ c, a: agg[c.id] }))
      .sort((x, y) => {
        const ax = x.a ? x.a.sum / x.a.count : 0;
        const ay = y.a ? y.a.sum / y.a.count : 0;
        if (ay !== ax) return ay - ax;
        return (y.a?.count ?? 0) - (x.a?.count ?? 0);
      })
      .slice(0, 8)
      .map(({ c }) => c);
  }, [filtered, agg]);

  function openDetail(c: Company) { setSelected(c); setDialogOpen(true); }
  function scrollCats(dir: 1 | -1) {
    catRowRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <a href="#" className="flex items-center gap-2 shrink-0">
            <img src={zamrateIcon} alt="ZamRate" className="size-10 rounded-xl object-cover" />
            <span className="font-display text-xl font-bold">
              Zam<span className="text-primary">Rate</span>
            </span>
          </a>
          <div className="flex-1 max-w-2xl relative mx-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for companies, categories or keywords…"
              className="pl-11 bg-secondary/60 border-border focus-visible:bg-card focus-visible:border-primary rounded-full h-11"
            />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground/80">
            <a href="#explore" className="hover:text-primary">Explore</a>
            <a href="#about" className="hover:text-primary">About</a>
            <a href="#trust" className="hover:text-primary">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SuggestCompanyDialog />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background"
        />
        <div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--primary)/0.12),transparent_60%)]"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] font-bold tracking-tight">
              The People&apos;s Pulse:{" "}
              <span className="text-primary">Zambia</span>
            </h1>
            <p className="mt-5 text-lg text-foreground/65 max-w-xl">
              Real reviews. Real experiences. Real impact.
            </p>
            <div className="mt-7 inline-flex items-center gap-3 bg-card/70 border border-border rounded-full pl-3 pr-5 py-2 shadow-card">
              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Shield className="size-4" />
              </div>
              <p className="text-sm">
                <span className="font-semibold">Privacy-First:</span>{" "}
                <span className="text-muted-foreground">No Tracking, No Personal Data.</span>
              </p>
            </div>
          </div>
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative aspect-[5/4] w-full max-w-md">
              {/* Stylized Zambian flag block */}
              <div className="absolute inset-y-6 right-8 w-44 rounded-xl overflow-hidden shadow-card-hover border border-border rotate-[3deg]">
                <div className="h-3/5 bg-[#198a00]" />
                <div className="h-1/5 bg-[#de2010]" />
                <div className="h-[10%] bg-foreground" />
                <div className="h-[10%] bg-[#ef7d00]" />
              </div>
              <div className="absolute inset-y-10 left-6 right-32 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent border border-primary/20 backdrop-blur-sm" />
              <Flag className="absolute bottom-4 left-10 size-10 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section id="explore" className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <button
            onClick={() => scrollCats(-1)}
            className="size-10 rounded-full bg-card border border-border hover:border-primary hover:text-primary flex items-center justify-center shrink-0"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div
            ref={catRowRef}
            className="flex-1 flex gap-3 overflow-x-auto scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: "none" }}
          >
            {[ALL_CATEGORY, ...CATEGORIES].map((c) => {
              const active = activeCategory === c.name;
              const Icon = c.icon;
              const count =
                c.name === ALL_CATEGORY.name
                  ? companies.length
                  : (categoryCounts[c.name] ?? 0);
              return (
                <button
                  key={c.name}
                  onClick={() => setActiveCategory(c.name)}
                  className={`shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`size-6 ${active ? "text-primary" : "text-foreground/70"}`} />
                  <div className="text-left">
                    <div className="font-semibold text-sm leading-tight whitespace-nowrap">
                      {c.name.replace(" and ", " & ")}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {count} {count === 1 ? "company" : "companies"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => scrollCats(1)}
            className="size-10 rounded-full bg-card border border-border hover:border-primary hover:text-primary flex items-center justify-center shrink-0"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </section>

      {/* Main: top rated + live activity */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <div className="flex items-end justify-between mb-5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              {activeCategory === ALL_CATEGORY.name ? "Top Rated Companies" : activeCategory}
            </h2>
            <button
              onClick={() => document.getElementById("all-companies")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="size-4" />
            </button>
          </div>

          {topRated.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No companies match your search.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {topRated.map((c) => {
                const a = agg[c.id];
                return (
                  <CompanyCard
                    key={c.id}
                    company={c}
                    avg={a ? a.sum / a.count : 0}
                    count={a?.count ?? 0}
                    onView={openDetail}
                    onRate={openDetail}
                  />
                );
              })}
            </div>
          )}

          {/* All companies (full filtered list) */}
          {filtered.length > topRated.length && (
            <div id="all-companies" className="mt-14">
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-5">All Companies</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((c) => {
                  const a = agg[c.id];
                  return (
                    <CompanyCard
                      key={c.id}
                      company={c}
                      avg={a ? a.sum / a.count : 0}
                      count={a?.count ?? 0}
                      onView={openDetail}
                      onRate={openDetail}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <LiveActivity />
      </main>

      {/* Trust strip */}
      <section id="trust" className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <TrustItem icon={<Users className="size-5" />} title="Citizen-Driven" text="By the people, for the people." />
          <TrustItem icon={<Shield className="size-5" />} title="100% Anonymous" text="Your voice, your privacy." />
          <TrustItem icon={<BarChart3 className="size-5" />} title="Real Impact" text="Ratings that drive better services." />
          <TrustItem icon={<Flag className="size-5" />} title="Zambia First" text="Proudly built for Zambia." />
        </div>
      </section>

      <footer className="bg-foreground text-background py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="max-w-xs">
            <div className="font-display text-2xl font-bold mb-2">
              Zam<span className="text-primary">Rate</span>
            </div>
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

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}
