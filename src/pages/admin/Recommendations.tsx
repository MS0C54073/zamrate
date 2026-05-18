import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/hooks/useAdmin";
import { anonHandle } from "@/lib/anonHandle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Trash2, Save, Search, ChevronLeft, ChevronRight, ArrowUpDown, CheckSquare } from "lucide-react";
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

type SortKey = "newest" | "oldest" | "top_voted" | "status";

export default function AdminRecommendations() {
  const [items, setItems] = useState<Rec[]>([]);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, { status: string; admin_response: string }>>({});
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("open");
  const [loading, setLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page on query/filter/sort/pageSize change
  useEffect(() => { setPage(1); }, [debouncedQuery, filter, sort, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("recommendations")
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    if (filter !== "all") q = q.eq("status", filter);

    if (debouncedQuery) {
      // Escape commas/parens to keep .or() safe
      const esc = debouncedQuery.replace(/[,()]/g, " ");
      const like = `%${esc}%`;
      q = q.or(
        `title.ilike.${like},body.ilike.${like},category.ilike.${like},admin_response.ilike.${like},anonymous_user_id.ilike.${like}`,
      );
    }

    switch (sort) {
      case "oldest":
        q = q.order("created_at", { ascending: true });
        break;
      case "top_voted":
        // Order by upvotes desc, then downvotes asc as a proxy for score
        q = q.order("upvotes", { ascending: false }).order("downvotes", { ascending: true });
        break;
      case "status":
        q = q.order("status", { ascending: true }).order("created_at", { ascending: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await q.range(from, to);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const list = (data ?? []) as Rec[];
    setItems(list);
    setTotal(count ?? 0);
    setDrafts((prev) => {
      const next = { ...prev };
      list.forEach((r) => {
        if (!next[r.id]) next[r.id] = { status: r.status, admin_response: r.admin_response ?? "" };
      });
      return next;
    });
  }, [filter, debouncedQuery, sort, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-recommendations")
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendations" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

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
    setSelected((s) => { const n = new Set(s); n.delete(r.id); return n; });
    toast.success("Removed.");
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      if (checked) n.add(id); else n.delete(id);
      return n;
    });
  }

  const allOnPageSelected = items.length > 0 && items.every((r) => selected.has(r.id));
  function toggleAllOnPage(checked: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      items.forEach((r) => { if (checked) n.add(r.id); else n.delete(r.id); });
      return n;
    });
  }

  async function bulkApplyStatus() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("recommendations")
      .update({ status: bulkStatus })
      .in("id", ids);
    if (error) return toast.error(error.message);
    void logAdminAction("bulk_update_recommendations", "recommendation", ids.join(","), `status=${bulkStatus}`);
    toast.success(`Updated ${ids.length} item${ids.length === 1 ? "" : "s"}.`);
    setSelected(new Set());
    void load();
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("recommendations")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return toast.error(error.message);
    void logAdminAction("bulk_delete_recommendations", "recommendation", ids.join(","));
    toast.success(`Removed ${ids.length} item${ids.length === 1 ? "" : "s"}.`);
    setSelected(new Set());
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const selectedCount = selected.size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-accent/20 pb-4">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <Lightbulb className="size-6 text-primary" /> Community Recommendations
          </h1>
          <p className="text-sm text-muted-foreground">Triage user-submitted ideas, respond, and update status.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, body, author…"
              className="pl-9 rounded-xl w-64"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-28 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40 rounded-xl gap-1">
              <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="top_voted">Top voted</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allOnPageSelected}
            onCheckedChange={(c) => toggleAllOnPage(Boolean(c))}
            aria-label="Select all on page"
          />
          <span className="text-muted-foreground">
            {selectedCount > 0 ? `${selectedCount} selected` : "Select all on page"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={bulkApplyStatus}
            disabled={selectedCount === 0}
            className="rounded-xl gap-2"
          >
            <CheckSquare className="size-4" /> Apply status
          </Button>
          <Button
            variant="outline"
            onClick={bulkDelete}
            disabled={selectedCount === 0}
            className="rounded-xl gap-2"
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          {selectedCount > 0 && (
            <Button variant="ghost" onClick={() => setSelected(new Set())} className="rounded-xl">
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {total === 0
          ? (loading ? "Loading…" : "No matches")
          : `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, total)} of ${total}`}
      </div>

      {total === 0 && !loading && (
        <p className="text-center text-muted-foreground py-12">No recommendations.</p>
      )}

      <div className="space-y-3">
        {items.map((r) => {
          const d = drafts[r.id] ?? { status: r.status, admin_response: r.admin_response ?? "" };
          const score = r.upvotes - r.downvotes;
          const isSelected = selected.has(r.id);
          return (
            <Card key={r.id} className={`rounded-2xl ${isSelected ? "ring-2 ring-primary/40" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(c) => toggleOne(r.id, Boolean(c))}
                      className="mt-1"
                      aria-label="Select recommendation"
                    />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
