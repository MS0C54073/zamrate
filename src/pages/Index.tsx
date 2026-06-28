import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Shield, Users, BarChart3, Flag,
  ChevronLeft, ChevronRight, Globe, Bell, ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, ALL_CATEGORY } from "@/lib/categories";
import { CompanyCard } from "@/components/CompanyCard";
import { CompanyDetailDialog } from "@/components/CompanyDetailDialog";
import { SuggestCompanyDialog } from "@/components/SuggestCompanyDialog";
import zamrateIcon from "@/assets/zamrate-icon.png";
import zambiaFlag from "@/assets/zambia-flag-wave.png";
import lusakaSkyline from "@/assets/lusaka-skyline.jpg";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const catRowRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
      supabase.from("companies").select("id, name, category, description, services, location, website, status, created_at, logo_url, updated_at").order("name"),
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

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const matches = companies
      .map((company) => ({
        company,
        score:
          (company.name.toLowerCase().startsWith(q) ? 3 : 0) +
          (company.category.toLowerCase().startsWith(q) ? 2 : 0) +
          (company.name.toLowerCase().includes(q) ? 1 : 0) +
          (company.category.toLowerCase().includes(q) ? 1 : 0) +
          ((company.description?.toLowerCase().includes(q) ?? false) ? 0.5 : 0) +
          ((company.services?.toLowerCase().includes(q) ?? false) ? 0.5 : 0),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name))
      .slice(0, 6)
      .map((item) => item.company);
    return matches;
  }, [companies, search]);

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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-6">
          <a href="#" className="flex items-center gap-2.5 shrink-0">
            <img src={zamrateIcon} alt="ZamRate" className="size-10 rounded-xl object-cover" />
            <span className="font-display text-2xl font-extrabold tracking-tight">
              Zam<span className="text-primary">Rate</span>
            </span>
          </a>
          <div className="flex-1 max-w-2xl relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <div className="relative">
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (!suggestions.length) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                    setShowSuggestions(true);
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                    setShowSuggestions(true);
                  }
                  if (e.key === "Enter" && highlightedIndex >= 0) {
                    e.preventDefault();
                    const company = suggestions[highlightedIndex];
                    setSearch(company.name);
                    setShowSuggestions(false);
                    setHighlightedIndex(-1);
                    openDetail(company);
                  }
                }}
                placeholder="Search for companies, categories or keywords…"
                className="pl-11 pr-16 bg-secondary/70 border-transparent focus-visible:bg-card focus-visible:border-primary rounded-full h-11 text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">⌘K</div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-border/70 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Suggestions
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {suggestions.map((company, index) => {
                      const active = index === highlightedIndex;
                      return (
                        <button
                          key={company.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setSearch(company.name);
                            setShowSuggestions(false);
                            setHighlightedIndex(-1);
                            openDetail(company);
                          }}
                          className={`w-full text-left px-4 py-3 transition ${
                            active ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                          }`}
                        >
                          <div className="font-semibold">{company.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {company.category} · {company.location ?? "Zambia"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-foreground/80">
            <a href="#explore" className="hover:text-primary flex items-center gap-1">
              Explore <ChevronDown className="size-3.5" />
            </a>
            <a href="#about" className="hover:text-primary">About</a>
            <a href="#trust" className="hover:text-primary">For Businesses</a>
          </nav>
          <button
            className="size-10 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
          </button>
          <div className="flex items-center gap-1">
            <div className="size-10 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs">
              AN
            </div>
            <ThemeToggle />
          </div>
          <SuggestCompanyDialog />
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background: skyline + flag, faded behind content */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <img
            src={lusakaSkyline}
            alt=""
            width={1920}
            height={640}
            className="absolute right-0 top-0 h-full w-[65%] object-cover object-bottom opacity-50 dark:opacity-20 [mask-image:linear-gradient(to_right,transparent_0%,black_30%,black_100%)]"
          />
          <img
            src={zambiaFlag}
            alt=""
            width={896}
            height={1024}
            className="absolute -right-4 -top-6 h-[125%] w-auto object-contain opacity-95 dark:opacity-85 drop-shadow-2xl"
          />
          {/* Left-to-right fade so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 via-40% to-background/20" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-6 pt-16 pb-14 min-h-[360px]">
          <div className="max-w-2xl">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] font-extrabold tracking-tight text-foreground">
              The People&apos;s Pulse:{" "}
              <span className="text-primary">Zambia</span>
            </h1>
            <p className="mt-5 text-xl text-foreground/70">
              Real reviews. Real experiences. Real impact.
            </p>
            <div className="mt-7 inline-flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Shield className="size-5" />
              </div>
              <p className="text-base">
                <span className="font-semibold">Privacy-First:</span>{" "}
                <span className="text-muted-foreground">No Tracking, No Personal Data.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Category strip — overlapping card */}
        <div id="explore" className="max-w-[1400px] mx-auto px-6 -mb-6 relative z-10">
          <div className="bg-card rounded-2xl shadow-card border border-border/60 p-3 flex items-center gap-2">
            <button
              onClick={() => scrollCats(-1)}
              className="size-10 rounded-full bg-card border border-border hover:border-primary hover:text-primary flex items-center justify-center shrink-0"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div
              ref={catRowRef}
              className="flex-1 flex gap-2 overflow-x-auto scroll-smooth no-scrollbar"
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
                    className={`shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary/60 text-foreground"
                    }`}
                  >
                    <Icon className={`size-7 ${active ? "text-primary" : "text-primary/80"}`} strokeWidth={1.75} />
                    <div className="text-left">
                      <div className="font-bold text-sm leading-tight whitespace-nowrap">
                        {c.short}
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
        </div>
      </section>

      {/* Main: top rated + live activity */}
      <main className="max-w-[1400px] mx-auto px-6 pt-14 pb-10 grid lg:grid-cols-[1fr_340px] gap-8">
        <section>
          <div className="flex items-end justify-between mb-5">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
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

          {filtered.length > topRated.length && (
            <div id="all-companies" className="mt-14">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-5">All Companies</h2>
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
      <section id="trust" className="max-w-[1400px] mx-auto px-6 pb-12">
        <div className="bg-card rounded-2xl border border-border/60 shadow-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <TrustItem icon={<Shield className="size-5" />} title="Citizen-Driven" text="By the people, for the people." />
          <TrustItem icon={<Users className="size-5" />} title="100% Anonymous" text="Your voice, your privacy." />
          <TrustItem icon={<BarChart3 className="size-5" />} title="Real Impact" text="Ratings that drive better services." />
          <TrustItem icon={<Flag className="size-5" />} title="Zambia First" text="Proudly built for Zambia." />
        </div>
      </section>

      <footer className="bg-foreground text-background py-10 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="max-w-xs">
            <div className="font-display text-2xl font-extrabold mb-2">
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
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}
