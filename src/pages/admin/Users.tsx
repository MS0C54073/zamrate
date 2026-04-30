import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserX, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, logAdminAction } from "@/hooks/useAdmin";

interface UserRow {
  anonId: string;
  ratings: number;
  comments: number;
  reportsAgainst: number;
  lastActivity: string | null;
  blocked: boolean;
}

export default function Users() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: ratings }, { data: comments }, { data: reports }, { data: blocks }] = await Promise.all([
      supabase.from("ratings").select("anonymous_user_id, updated_at, created_at").limit(2000),
      supabase.from("comments").select("id, anonymous_user_id, created_at").limit(2000),
      supabase.from("reported_comments").select("comment_id"),
      supabase.from("blocked_users").select("anonymous_user_id, status"),
    ]);

    const commentIdToAuthor = new Map<string, string>();
    (comments ?? []).forEach((c) => commentIdToAuthor.set(c.id, c.anonymous_user_id));

    const reportsByAuthor = new Map<string, number>();
    (reports ?? []).forEach((r) => {
      const author = commentIdToAuthor.get(r.comment_id);
      if (author) reportsByAuthor.set(author, (reportsByAuthor.get(author) ?? 0) + 1);
    });

    const blockedSet = new Set((blocks ?? []).filter((b) => b.status === "active").map((b) => b.anonymous_user_id));

    const map = new Map<string, UserRow>();
    function bump(id: string, ts: string | null) {
      const cur = map.get(id) ?? { anonId: id, ratings: 0, comments: 0, reportsAgainst: 0, lastActivity: null, blocked: blockedSet.has(id) };
      if (ts && (!cur.lastActivity || ts > cur.lastActivity)) cur.lastActivity = ts;
      map.set(id, cur);
    }
    (ratings ?? []).forEach((r) => { bump(r.anonymous_user_id, r.updated_at ?? r.created_at); map.get(r.anonymous_user_id)!.ratings += 1; });
    (comments ?? []).forEach((c) => { bump(c.anonymous_user_id, c.created_at); map.get(c.anonymous_user_id)!.comments += 1; });
    blockedSet.forEach((id) => { if (!map.has(id)) bump(id, null); });
    map.forEach((u) => { u.reportsAgainst = reportsByAuthor.get(u.anonId) ?? 0; });

    setRows(Array.from(map.values()).sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")));
    setLoading(false);
  }

  async function block(u: UserRow) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("blocked_users").insert({
      anonymous_user_id: u.anonId, reason: "Manual block from admin", blocked_by_admin_id: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    await logAdminAction("user.block", "anon_user", u.anonId);
    toast.success("Blocked.");
    void load();
  }
  async function unblock(u: UserRow) {
    const { error } = await supabase.from("blocked_users").update({ status: "inactive" }).eq("anonymous_user_id", u.anonId).eq("status", "active");
    if (error) return toast.error(error.message);
    await logAdminAction("user.unblock", "anon_user", u.anonId);
    toast.success("Unblocked.");
    void load();
  }

  const filtered = useMemo(() => rows.filter((r) => !q || r.anonId.includes(q.toLowerCase())), [rows, q]);

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Users</h1>
      <p className="text-sm text-muted-foreground mb-5">Anonymous identities only — no personal data exposed.</p>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search anonymous ID…" className="pl-9 rounded-xl" />
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.anonId} className="rounded-2xl">
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 mb-1">
                    {u.blocked ? <Badge variant="outline" className="bg-rose-100 text-rose-900 border-rose-300">Blocked</Badge> : <Badge variant="outline" className="bg-emerald-100 text-emerald-900 border-emerald-300">Active</Badge>}
                  </div>
                  <p className="font-mono text-sm break-all">{u.anonId}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {u.ratings} ratings · {u.comments} comments · {u.reportsAgainst} reports against
                    {u.lastActivity && ` · last active ${new Date(u.lastActivity).toLocaleDateString()}`}
                  </p>
                </div>
                {can.blockUsers && (u.blocked
                  ? <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => unblock(u)}><RotateCcw className="size-3" /> Unblock</Button>
                  : <Button size="sm" variant="destructive" className="rounded-xl gap-1" onClick={() => block(u)}><UserX className="size-3" /> Block</Button>)}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No users match.</p>}
        </div>
      )}
    </div>
  );
}
