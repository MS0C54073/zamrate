import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, logAdminAction } from "@/hooks/useAdmin";
import { CATEGORIES } from "@/lib/categories";

interface Sug { id: string; company_name: string; category: string; description: string | null; services: string | null; status: string; created_at: string; }

export default function Suggestions() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<Sug[]>([]);
  const [editing, setEditing] = useState<Sug | null>(null);
  const [form, setForm] = useState<Sug | null>(null);

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data } = await supabase.from("company_suggestions").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Sug[]);
  }

  async function approve(s: Sug) {
    const final = form && form.id === s.id ? form : s;
    const { data, error } = await supabase.from("companies").insert({
      name: final.company_name, category: final.category,
      description: final.description, services: final.services, status: "approved",
    }).select("id").single();
    if (error) return toast.error(error.message);
    await supabase.from("company_suggestions").update({ status: "approved" }).eq("id", s.id);
    await logAdminAction("suggestion.approve", "suggestion", s.id, final.company_name);
    toast.success("Approved & added. You can upload a logo from Companies.");
    setEditing(null); setForm(null);
    void load();
  }
  async function reject(id: string) {
    const { error } = await supabase.from("company_suggestions").update({ status: "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction("suggestion.reject", "suggestion", id);
    toast.success("Rejected.");
    void load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("company_suggestions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction("suggestion.delete", "suggestion", id);
    toast.success("Removed.");
    void load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-5">Company Suggestions</h1>
      <div className="space-y-3">
        {rows.map((s) => (
          <Card key={s.id} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-muted-foreground">
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
                    <Button size="sm" onClick={() => approve(s)} className="rounded-xl gap-1"><Check className="size-3" /> Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(s); setForm(s); }} className="rounded-xl gap-1"><Pencil className="size-3" /> Edit & approve</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(s.id)} className="rounded-xl gap-1"><X className="size-3" /> Reject</Button>
                  </>
                )}
                {can.deleteSuggestions && <Button size="sm" variant="destructive" onClick={() => remove(s.id)} className="rounded-xl gap-1"><Trash2 className="size-3" /> Delete</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-12">No suggestions yet.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && (setEditing(null), setForm(null))}>
        <DialogContent className="rounded-3xl max-w-xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">Edit before approval</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <Field label="Name *"><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} maxLength={200} /></Field>
              <Field label="Category">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} /></Field>
              <Field label="Services"><Textarea value={form.services ?? ""} onChange={(e) => setForm({ ...form, services: e.target.value })} maxLength={2000} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => { setEditing(null); setForm(null); }}>Cancel</Button>
            <Button onClick={() => editing && approve(editing)} className="rounded-xl">Approve & add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{label}</Label>{children}</div>;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300",
    approved: "bg-emerald-100 text-emerald-900 border-emerald-300",
    rejected: "bg-rose-100 text-rose-900 border-rose-300",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}
