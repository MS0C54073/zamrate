import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/hooks/useAdmin";
import { anonHandle } from "@/lib/anonHandle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Trash2, Save, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Rec {
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

const STATUSES = ["open", "planned", "in_progress", "done", "rejected"];
const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-900 border-blue-300",
  planned: "bg-amber-100 text-amber-900 border-amber-300",
  in_progress: "bg-violet-100 text-violet-900 border-violet-300",
  done: "bg-emerald-100 text-emerald-900 border-emerald-300",
  rejected: "bg-rose-100 text-rose-900 border-rose-300",
};

export default function AdminRecommendations() {
  const [items, setItems] = useState<Rec[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; admin_response: string }>>({});
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-recommendations")
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendations" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const { data } = await supabase
      .from("recommendations")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Rec[];
    setItems(list);
    setDrafts((prev) => {
      const next = { ...prev };
      list.forEach((r) => {
        if (!next[r.id]) next[r.id] = { status: r.status, admin_response: r.admin_response ?? "" };
      });
      return next;
    });
  }

  async function save(r: Rec) {
    const d = drafts[r.id];
    const { error } = await supabase
      .from("recommendations")
      .update({ status: d.status, admin_response: d.admin_response || null })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    void logAdminAction("update_recommendation", "recommendation", r.id, `status=${d.status}`);
    toast.success("Updated.");
  }

  async function softDelete(r: Rec) {
    const { error } = await supabase
      .from("recommendations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    void logAdminAction("delete_recommendation", "recommendation", r.id);
    toast.success("Removed.");
  }

  const filtered = filter === "all" ? items : items.filter((r) => r.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between border-b border-accent/20 pb-4">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <Lightbulb className="size-6 text-primary" /> Community Recommendations
          </h1>
          <p className="text-sm text-muted-foreground">Triage user-submitted ideas, respond, and update status.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No recommendations.</p>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const d = drafts[r.id] ?? { status: r.status, admin_response: r.admin_response ?? "" };
          const score = r.upvotes - r.downvotes;
          return (
            <Card key={r.id} className="rounded-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge>
                      <Badge variant="outline">{r.category}</Badge>
                      <span>by {anonHandle(r.anonymous_user_id)}</span>
                      <span>· {new Date(r.created_at).toLocaleString()}</span>
                      <span>· score {score} (👍 {r.upvotes} / 👎 {r.downvotes})</span>
                    </div>
                    <h3 className="font-display text-lg leading-tight">{r.title}</h3>
                    <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{r.body}</p>
                  </div>
                  <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => softDelete(r)} aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid sm:grid-cols-[200px_1fr_auto] gap-2 items-start">
                  <Select
                    value={d.status}
                    onValueChange={(v) => setDrafts({ ...drafts, [r.id]: { ...d, status: v } })}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Admin response (optional, shown publicly)…"
                    value={d.admin_response}
                    onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...d, admin_response: e.target.value } })}
                    className="rounded-xl min-h-12"
                    maxLength={2000}
                  />
                  <Button onClick={() => save(r)} className="rounded-xl gap-2">
                    <Save className="size-4" /> Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
