import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAnonId } from "@/lib/anonId";
import { anonHandle } from "@/lib/anonHandle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, ThumbsDown, Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Recommendation {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  anonymous_user_id: string;
  upvotes: number;
  downvotes: number;
  admin_response: string | null;
  created_at: string;
}

const CATEGORIES = ["feature", "fix", "improvement", "other"];
const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-900 border-blue-300",
  planned: "bg-amber-100 text-amber-900 border-amber-300",
  in_progress: "bg-violet-100 text-violet-900 border-violet-300",
  done: "bg-emerald-100 text-emerald-900 border-emerald-300",
  rejected: "bg-rose-100 text-rose-900 border-rose-300",
};

const schema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(2000),
  category: z.string().min(1),
});

export function Recommendations() {
  const anonId = getAnonId();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ title: "", body: "", category: "feature" });
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<"top" | "new">("top");

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("recommendations-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendations" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendation_votes" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const [{ data: recs }, { data: votes }] = await Promise.all([
      supabase.from("recommendations").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("recommendation_votes").select("recommendation_id, vote").eq("anonymous_user_id", anonId),
    ]);
    setItems((recs ?? []) as Recommendation[]);
    const m: Record<string, number> = {};
    (votes ?? []).forEach((v: { recommendation_id: string; vote: number }) => { m[v.recommendation_id] = v.vote; });
    setMyVotes(m);
  }

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error("Please fill all fields (title 3-200, details 3-2000).");
    setSubmitting(true);
    const { error } = await supabase.from("recommendations").insert({
      ...parsed.data,
      anonymous_user_id: anonId,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks! Your recommendation is live.");
    setForm({ title: "", body: "", category: "feature" });
  }

  async function vote(rec: Recommendation, value: 1 | -1) {
    const current = myVotes[rec.id];
    if (current === value) {
      const { error } = await supabase
        .from("recommendation_votes")
        .delete()
        .eq("recommendation_id", rec.id)
        .eq("anonymous_user_id", anonId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("recommendation_votes")
        .upsert(
          { recommendation_id: rec.id, anonymous_user_id: anonId, vote: value },
          { onConflict: "recommendation_id,anonymous_user_id" },
        );
      if (error) return toast.error(error.message);
    }
  }

  const sorted = [...items].sort((a, b) => {
    if (sort === "new") return +new Date(b.created_at) - +new Date(a.created_at);
    return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
  });

  return (
    <section id="recommendations" className="mt-20">
      <div className="flex items-end justify-between mb-6 border-b border-accent/20 pb-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-clay flex items-center gap-2">
            <Lightbulb className="size-7 text-primary" /> Community Recommendations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suggest features, report what to fix, or back what others want. Admins are listening.
          </p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as "top" | "new")}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top voted</SelectItem>
            <SelectItem value="new">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-3xl mb-8">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Title — what should we build or fix?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              className="rounded-xl flex-1"
            />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="rounded-xl sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Describe your idea, the change you want, or what needs fixing…"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            maxLength={2000}
            className="rounded-xl min-h-24"
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting} className="rounded-xl gap-2">
              <Send className="size-4" /> Post recommendation
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sorted.map((r) => {
          const score = r.upvotes - r.downvotes;
          const myVote = myVotes[r.id];
          const mine = r.anonymous_user_id === anonId;
          return (
            <Card key={r.id} className="rounded-2xl">
              <CardContent className="p-4 flex gap-4">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Button
                    size="icon"
                    variant={myVote === 1 ? "default" : "outline"}
                    className="rounded-full size-9"
                    onClick={() => vote(r, 1)}
                    aria-label="Upvote"
                  >
                    <ThumbsUp className="size-4" />
                  </Button>
                  <span className="font-display tabular-nums text-lg">{score}</span>
                  <Button
                    size="icon"
                    variant={myVote === -1 ? "destructive" : "outline"}
                    className="rounded-full size-9"
                    onClick={() => vote(r, -1)}
                    aria-label="Downvote"
                  >
                    <ThumbsDown className="size-4" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge>
                    <Badge variant="outline">{r.category}</Badge>
                    <span>by {anonHandle(r.anonymous_user_id)}{mine && " (you)"}</span>
                    <span>· {new Date(r.created_at).toLocaleDateString()}</span>
                    <span>· 👍 {r.upvotes} · 👎 {r.downvotes}</span>
                  </div>
                  <h3 className="font-display text-lg leading-tight">{r.title}</h3>
                  <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{r.body}</p>
                  {r.admin_response && (
                    <div className="mt-3 rounded-xl bg-primary/10 border border-primary/20 p-3 text-sm">
                      <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Admin response</div>
                      {r.admin_response}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sorted.length === 0 && <p className="text-center text-muted-foreground py-12">No recommendations yet — be the first.</p>}
      </div>
    </section>
  );
}
