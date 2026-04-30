import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Check, X, Trash2, RotateCcw, Search, CornerDownRight, Flag } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, logAdminAction } from "@/hooks/useAdmin";

interface CommentRow {
  id: string; company_id: string; parent_comment_id: string | null;
  comment_text: string; status: string; created_at: string; report_count: number;
  deleted_at: string | null; anonymous_user_id: string;
}

export default function Comments() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [reported, setReported] = useState(false);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<CommentRow | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const [{ data: cs }, { data: cos }] = await Promise.all([
      supabase.from("comments").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("companies").select("id, name"),
    ]);
    setRows((cs ?? []) as CommentRow[]);
    const m: Record<string, string> = {};
    (cos ?? []).forEach((c) => { m[c.id] = c.name; });
    setCompanies(m);
  }

  async function setStatusOf(c: CommentRow, next: "approved" | "rejected") {
    const { error } = await supabase.from("comments").update({ status: next, deleted_at: null }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAdminAction(`comment.${next}`, "comment", c.id);
    toast.success(`Comment ${next}.`);
    void load();
  }

  async function softDelete(c: CommentRow) {
    const { error } = await supabase.from("comments").update({ status: "rejected", deleted_at: new Date().toISOString() }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAdminAction("comment.softDelete", "comment", c.id);
    toast.success("Comment removed.");
    void load();
  }
  async function restore(c: CommentRow) {
    const { error } = await supabase.from("comments").update({ status: "approved", deleted_at: null }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAdminAction("comment.restore", "comment", c.id);
    toast.success("Restored.");
    void load();
  }
  async function permaDelete(c: CommentRow) {
    const { error } = await supabase.from("comments").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAdminAction("comment.delete", "comment", c.id);
    toast.success("Permanently removed.");
    setConfirmDelete(null);
    void load();
  }

  const companyOptions = useMemo(() => Object.entries(companies).sort((a, b) => a[1].localeCompare(b[1])), [companies]);

  const filtered = rows.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (reported && c.report_count <= 0) return false;
    if (companyFilter !== "all" && c.company_id !== companyFilter) return false;
    if (q && !c.comment_text.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Comments</h1>
      <p className="text-sm text-muted-foreground mb-5">{rows.length} total · {filtered.length} shown</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search comment text…" className="pl-9 rounded-xl" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-56 rounded-xl"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companyOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={reported ? "default" : "outline"} className="rounded-xl gap-1" onClick={() => setReported((v) => !v)}>
          <Flag className="size-4" /> Reported only
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <Card key={c.id} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Badge variant="outline">{c.parent_comment_id ? <span className="flex items-center gap-1"><CornerDownRight className="size-3" />Reply</span> : "Comment"}</Badge>
                <StatusBadge status={c.status} />
                {c.report_count > 0 && <Badge className="bg-rose-100 text-rose-900 border-rose-300" variant="outline">⚑ {c.report_count} reports</Badge>}
                {c.deleted_at && <Badge variant="outline" className="bg-muted">Soft-deleted</Badge>}
                <span>on <strong className="text-foreground">{companies[c.company_id] ?? "—"}</strong></span>
                <span>· {new Date(c.created_at).toLocaleString()}</span>
                <span className="font-mono">· {c.anonymous_user_id.slice(0, 8)}…</span>
              </div>
              <p className="text-sm whitespace-pre-wrap mb-3">{c.comment_text}</p>
              <div className="flex flex-wrap gap-2">
                {c.status !== "approved" && can.manageComments && (
                  <Button size="sm" onClick={() => setStatusOf(c, "approved")} className="rounded-xl gap-1"><Check className="size-3" /> Approve</Button>
                )}
                {c.status !== "rejected" && can.manageComments && (
                  <Button size="sm" variant="outline" onClick={() => setStatusOf(c, "rejected")} className="rounded-xl gap-1"><X className="size-3" /> Reject</Button>
                )}
                {c.deleted_at && can.manageComments && (
                  <Button size="sm" variant="outline" onClick={() => restore(c)} className="rounded-xl gap-1"><RotateCcw className="size-3" /> Restore</Button>
                )}
                {!c.deleted_at && can.deleteComments && (
                  <Button size="sm" variant="outline" onClick={() => softDelete(c)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Soft delete</Button>
                )}
                {can.deleteComments && (
                  <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(c)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Permanently remove</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No comments match.</p>}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently remove comment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Replies attached to this comment may also be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && permaDelete(confirmDelete)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300",
    approved: "bg-emerald-100 text-emerald-900 border-emerald-300",
    rejected: "bg-rose-100 text-rose-900 border-rose-300",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}
