import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Check, X, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  company_id: string;
  parent_comment_id: string | null;
  comment_text: string;
  status: string;
  created_at: string;
}
interface CompanyRow {
  id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
}
interface SuggestionRow {
  id: string;
  company_name: string;
  category: string;
  description: string | null;
  services: string | null;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { isAdmin, session, loading } = useAdmin();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loading) return;
    if (!session) { nav("/admin-login"); return; }
    if (!isAdmin) return;
    void loadAll();
  }, [loading, session, isAdmin]);

  async function loadAll() {
    const [{ data: cs }, { data: cos }, { data: ss }] = await Promise.all([
      supabase.from("comments").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("*").order("created_at", { ascending: false }),
      supabase.from("company_suggestions").select("*").order("created_at", { ascending: false }),
    ]);
    setComments((cs ?? []) as CommentRow[]);
    setCompanies((cos ?? []) as CompanyRow[]);
    setSuggestions((ss ?? []) as SuggestionRow[]);
    const map: Record<string, string> = {};
    (cos ?? []).forEach((c) => { map[c.id] = c.name; });
    setCompanyMap(map);
  }

  async function setCommentStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("comments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Comment ${status}.`);
    void loadAll();
  }
  async function deleteComment(id: string) {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comment removed.");
    void loadAll();
  }
  async function setCompanyStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("companies").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Company ${status}.`);
    void loadAll();
  }
  async function deleteCompany(id: string) {
    if (!confirm("Delete this company and all its ratings/comments? This cannot be undone.")) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Company deleted.");
    void loadAll();
  }
  async function approveSuggestion(s: SuggestionRow) {
    const { error: insErr } = await supabase.from("companies").insert({
      name: s.company_name,
      category: s.category,
      description: s.description,
      services: s.services,
      status: "approved",
    });
    if (insErr) return toast.error(insErr.message);
    await supabase.from("company_suggestions").update({ status: "approved" }).eq("id", s.id);
    toast.success("Suggestion approved & company added.");
    void loadAll();
  }
  async function rejectSuggestion(id: string) {
    const { error } = await supabase.from("company_suggestions").update({ status: "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Suggestion rejected.");
    void loadAll();
  }
  async function deleteSuggestion(id: string) {
    const { error } = await supabase.from("company_suggestions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Suggestion removed.");
    void loadAll();
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav("/");
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full rounded-3xl">
          <CardHeader className="text-center">
            <div className="mx-auto size-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-2">
              <Shield className="size-7" />
            </div>
            <CardTitle className="font-display text-2xl">Not authorized</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account ({session?.user.email}) does not have admin access. An existing admin must grant you the admin role.
            </p>
            <Button onClick={signOut} variant="outline" className="rounded-xl">Sign out</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingComments = comments.filter((c) => c.status === "pending");
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-accent/20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-xl">ZamRate · Admin</h1>
              <p className="text-xs text-muted-foreground">{session?.user.email}</p>
            </div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="rounded-xl gap-1">
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Pending comments" value={pendingComments.length} />
          <StatCard label="Pending suggestions" value={pendingSuggestions.length} />
          <StatCard label="Total companies" value={companies.length} />
        </div>

        <Tabs defaultValue="comments">
          <TabsList className="rounded-xl">
            <TabsTrigger value="comments">Comments ({pendingComments.length})</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions ({pendingSuggestions.length})</TabsTrigger>
            <TabsTrigger value="companies">Companies ({companies.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="mt-6 space-y-3">
            {comments.length === 0 && <Empty text="No comments yet." />}
            {comments.map((c) => (
              <Card key={c.id} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{c.parent_comment_id ? "Reply" : "Comment"}</Badge>
                      <StatusBadge status={c.status} />
                      <span>on <strong className="text-foreground">{companyMap[c.company_id] ?? "—"}</strong></span>
                      <span>· {new Date(c.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mb-3">{c.comment_text}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.status !== "approved" && (
                      <Button size="sm" onClick={() => setCommentStatus(c.id, "approved")} className="rounded-xl gap-1"><Check className="size-3" /> Approve</Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => setCommentStatus(c.id, "rejected")} className="rounded-xl gap-1"><X className="size-3" /> Reject</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteComment(c.id)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6 space-y-3">
            {suggestions.length === 0 && <Empty text="No suggestions yet." />}
            {suggestions.map((s) => (
              <Card key={s.id} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <StatusBadge status={s.status} />
                    <Badge variant="outline">{s.category}</Badge>
                    <span>· {new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="font-display text-lg">{s.company_name}</h3>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                  {s.services && <p className="text-xs text-muted-foreground mt-1"><strong>Services:</strong> {s.services}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {s.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => approveSuggestion(s)} className="rounded-xl gap-1"><Check className="size-3" /> Approve & add</Button>
                        <Button size="sm" variant="outline" onClick={() => rejectSuggestion(s.id)} className="rounded-xl gap-1"><X className="size-3" /> Reject</Button>
                      </>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteSuggestion(s.id)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="companies" className="mt-6 space-y-3">
            {companies.map((c) => (
              <Card key={c.id} className="rounded-2xl">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={c.status} />
                      <Badge variant="outline">{c.category}</Badge>
                    </div>
                    <h3 className="font-display text-lg">{c.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    {c.status !== "approved" && (
                      <Button size="sm" onClick={() => setCompanyStatus(c.id, "approved")} className="rounded-xl gap-1"><Check className="size-3" /> Approve</Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => setCompanyStatus(c.id, "rejected")} className="rounded-xl gap-1"><X className="size-3" /> Hide</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => deleteCompany(c.id)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
        <div className="font-display text-4xl text-clay tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
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

function Empty({ text }: { text: string }) {
  return <p className="text-center text-muted-foreground py-12">{text}</p>;
}
