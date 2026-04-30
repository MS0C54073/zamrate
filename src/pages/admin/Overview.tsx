import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Star, MessagesSquare, Clock, Flag, UserX, Lightbulb, TrendingUp,
} from "lucide-react";

interface Stats {
  totalCompanies: number;
  totalRatings: number;
  totalComments: number;
  pendingComments: number;
  reportedComments: number;
  blockedUsers: number;
  pendingSuggestions: number;
  avgRating: number;
}

export default function Overview() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const [
      companies, ratings, comments, pending, reported, blocked, sugg,
    ] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("ratings").select("rating"),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("comments").select("id", { count: "exact", head: true }).gt("report_count", 0),
      supabase.from("blocked_users").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("company_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const rs = (ratings.data ?? []) as { rating: number }[];
    const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0;

    setS({
      totalCompanies: companies.count ?? 0,
      totalRatings: rs.length,
      totalComments: comments.count ?? 0,
      pendingComments: pending.count ?? 0,
      reportedComments: reported.count ?? 0,
      blockedUsers: blocked.count ?? 0,
      pendingSuggestions: sugg.count ?? 0,
      avgRating: avg,
    });
  }

  const cards = [
    { label: "Total companies", value: s?.totalCompanies ?? "—", icon: Building2 },
    { label: "Total ratings", value: s?.totalRatings ?? "—", icon: Star },
    { label: "Total comments", value: s?.totalComments ?? "—", icon: MessagesSquare },
    { label: "Pending comments", value: s?.pendingComments ?? "—", icon: Clock, accent: true },
    { label: "Reported comments", value: s?.reportedComments ?? "—", icon: Flag, accent: true },
    { label: "Blocked users", value: s?.blockedUsers ?? "—", icon: UserX },
    { label: "Pending suggestions", value: s?.pendingSuggestions ?? "—", icon: Lightbulb, accent: true },
    { label: "Avg platform rating", value: s ? s.avgRating.toFixed(2) : "—", icon: TrendingUp },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Dashboard</h1>
      <p className="text-sm text-muted-foreground mb-6">Live overview of platform activity.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">{c.label}</div>
                  <div className={`font-display text-3xl tabular-nums mt-1 ${c.accent ? "text-clay" : ""}`}>{c.value}</div>
                </div>
                <div className={`size-10 rounded-xl flex items-center justify-center ${c.accent ? "bg-clay/10 text-clay" : "bg-secondary text-foreground"}`}>
                  <c.icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
