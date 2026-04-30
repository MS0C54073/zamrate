import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Trash2, UserX, Eye } from "lucide-react";
import { useAdmin, logAdminAction } from "@/hooks/useAdmin";

interface Report {
  id: string; comment_id: string; reason: string; status: string;
  created_at: string; reported_by_anonymous_user_id: string;
  reviewed_at: string | null;
}
interface Comment { id: string; comment_text: string; company_id: string; report_count: number; anonymous_user_id: string; }

export default function Reports() {
  const { can } = useAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [comments, setComments] = useState<Record<string, Comment>>({});
  const [companies, setCompanies] = useState<Record<string, string>>({});

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: rs } = await supabase.from("reported_comments").select("*").order("created_at", { ascending: false });
    const items = (rs ?? []) as Report[];
    setReports(items);
    const ids = Array.from(new Set(items.map((r) => r.comment_id)));
    if (ids.length) {
      const { data: cs } = await supabase.from("comments").select("id, comment_text, company_id, report_count, anonymous_user_id").in("id", ids);
      const m: Record<string, Comment> = {};
      (cs ?? []).forEach((c) => { m[c.id] = c as Comment; });
      setComments(m);
      const coIds = Array.from(new Set((cs ?? []).map((c) => c.company_id)));
      if (coIds.length) {
        const { data: cos } = await supabase.from("companies").select("id, name").in("id", coIds);
        const cm: Record<string, string> = {};
        (cos ?? []).forEach((c) => { cm[c.id] = c.name; });
        setCompanies(cm);
      }
    }
  }

  async function review(r: Report, decision: "reviewed" | "dismissed") {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reported_comments").update({
      status: decision, reviewed_at: new Date().toISOString(), reviewed_by_admin_id: user?.id ?? null,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction(`report.${decision}`, "report", r.id);
    toast.success(`Marked ${decision}.`);
    void load();
  }

  async function deleteComment(r: Report) {
    const { error } = await supabase.from("comments").delete().eq("id", r.comment_id);
    if (error) return toast.error(error.message);
    await review(r, "reviewed");
    await logAdminAction("comment.delete", "comment", r.comment_id, "via report");
    toast.success("Comment removed.");
    void load();
  }

  async function blockReporter(r: Report) {
    if (!can.blockUsers) return toast.error("You can't block users.");
    const c = comments[r.comment_id];
    if (!c) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("blocked_users").insert({
      anonymous_user_id: c.anonymous_user_id,
      reason: `Abusive comment (report ${r.id})`,
      blocked_by_admin_id: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    await logAdminAction("user.block", "anon_user", c.anonymous_user_id, `via report ${r.id}`);
    toast.success("User blocked.");
    void load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Reported Comments</h1>
      <p className="text-sm text-muted-foreground mb-5">{reports.length} total reports</p>

      <div className="space-y-3">
        {reports.map((r) => {
          const c = comments[r.comment_id];
          return (
            <Card key={r.id} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <StatusBadge status={r.status} />
                  {c && c.report_count > 1 && <Badge variant="outline">⚑ {c.report_count} reports</Badge>}
                  <span>on <strong className="text-foreground">{c ? companies[c.company_id] ?? "—" : "deleted comment"}</strong></span>
                  <span>· {new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 mb-2">
                  <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Reported text</p>
                  <p className="text-sm whitespace-pre-wrap">{c ? c.comment_text : "(comment no longer exists)"}</p>
                </div>
                <p className="text-sm"><strong>Reason:</strong> {r.reason}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => review(r, "reviewed")} className="rounded-xl gap-1"><Eye className="size-3" /> Mark reviewed</Button>
                      <Button size="sm" variant="outline" onClick={() => review(r, "dismissed")} className="rounded-xl gap-1"><Check className="size-3" /> Dismiss</Button>
                    </>
                  )}
                  {c && (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => deleteComment(r)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Delete comment</Button>
                      {can.blockUsers && (
                        <Button size="sm" variant="destructive" onClick={() => blockReporter(r)} className="rounded-xl gap-1"><UserX className="size-3" /> Block author</Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {reports.length === 0 && <p className="text-center text-muted-foreground py-12">No reports yet.</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300",
    reviewed: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dismissed: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}
