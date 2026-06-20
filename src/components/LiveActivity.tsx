import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Star } from "lucide-react";

interface Item { id: string; company: string; rating: number; created_at: string; }

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function LiveActivity() {
  const [items, setItems] = useState<Item[]>([]);

  async function load() {
    const { data } = await supabase
      .from("ratings")
      .select("id, rating, created_at, companies(name)")
      .order("created_at", { ascending: false })
      .limit(8);
    setItems(
      (data ?? []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        created_at: r.created_at,
        company: r.companies?.name ?? "a company",
      })),
    );
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("live-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ratings" }, () => void load())
      .subscribe();
    const t = setInterval(load, 30_000);
    return () => { void supabase.removeChannel(ch); clearInterval(t); };
  }, []);

  return (
    <aside className="bg-card rounded-2xl border border-border/60 shadow-card p-5 h-fit sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          Live Activity
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
            <span className="relative size-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">No activity yet — be the first.</li>
        )}
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3">
            <div className="size-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground">AN</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">
                <span className="text-muted-foreground">Anonymous rated </span>
                <span className="font-semibold truncate">{it.company}</span>
              </p>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={n <= it.rating ? "size-3 fill-gold stroke-gold" : "size-3 stroke-muted-foreground/30 fill-transparent"}
                  />
                ))}
                <span className="text-[11px] text-muted-foreground ml-1">{timeAgo(it.created_at)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 pt-4 border-t border-border/60 flex items-start gap-2 text-xs text-muted-foreground">
        <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Activity className="size-3" />
        </div>
        <p>
          <span className="font-semibold text-foreground">All ratings are anonymous.</span><br />
          We don&apos;t collect. We don&apos;t track. Ever.
        </p>
      </div>
    </aside>
  );
}
