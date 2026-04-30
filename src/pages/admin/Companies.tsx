import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Search, ImagePlus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, logAdminAction } from "@/hooks/useAdmin";
import { CATEGORIES } from "@/lib/categories";
import { z } from "zod";

interface Company {
  id: string; name: string; category: string; description: string | null;
  services: string | null; location: string | null; website: string | null;
  phone: string | null; email: string | null; logo_url: string | null;
  status: string; created_at: string; updated_at: string;
}

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().min(1),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  services: z.string().trim().max(2000).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
  email: z.string().trim().max(255).optional().or(z.literal("")),
  status: z.enum(["approved", "pending", "rejected"]),
});

type FormState = z.infer<typeof schema>;
const empty: FormState = { name: "", category: CATEGORIES[0].name, description: "", services: "", location: "", website: "", phone: "", email: "", status: "approved" };

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_LOGO_BYTES = 1024 * 1024 * 2; // 2MB

export default function Companies() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<Company[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [editing, setEditing] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Company[]);
  }

  function openCreate() {
    setForm(empty); setLogoFile(null); setEditing(null); setCreating(true);
  }
  function openEdit(c: Company) {
    setForm({
      name: c.name, category: c.category, description: c.description ?? "", services: c.services ?? "",
      location: c.location ?? "", website: c.website ?? "", phone: c.phone ?? "", email: c.email ?? "",
      status: (c.status as "approved" | "pending" | "rejected"),
    });
    setLogoFile(null); setEditing(c); setCreating(false);
  }

  async function uploadLogoIfAny(companyId: string): Promise<string | null> {
    if (!logoFile) return null;
    if (!ALLOWED_TYPES.includes(logoFile.type)) { toast.error("Logo must be PNG, JPG, or WEBP"); return null; }
    if (logoFile.size > MAX_LOGO_BYTES) { toast.error("Logo must be under 2MB"); return null; }
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `public/${companyId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, logoFile, {
      upsert: true, contentType: logoFile.type,
    });
    if (error) { toast.error(`Logo upload failed: ${error.message}`); return null; }
    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description?.trim() || null,
        services: form.services?.trim() || null,
        location: form.location?.trim() || null,
        website: form.website?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        status: form.status,
      };
      let companyId: string;
      if (editing) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editing.id);
        if (error) throw error;
        companyId = editing.id;
      } else {
        const { data, error } = await supabase.from("companies").insert(payload).select("id").single();
        if (error) throw error;
        companyId = data.id;
      }
      const newUrl = await uploadLogoIfAny(companyId);
      if (newUrl) {
        const { error } = await supabase.from("companies").update({ logo_url: newUrl }).eq("id", companyId);
        if (error) throw error;
      }
      await logAdminAction(editing ? "company.update" : "company.create", "company", companyId, payload.name);
      toast.success(editing ? "Company updated." : "Company added.");
      setEditing(null); setCreating(false); setLogoFile(null);
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setBusy(false); }
  }

  async function remove(c: Company) {
    const { error } = await supabase.from("companies").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAdminAction("company.delete", "company", c.id, c.name);
    toast.success("Company deleted.");
    setConfirmDelete(null);
    void load();
  }

  async function toggleStatus(c: Company, next: "approved" | "pending" | "rejected") {
    const { error } = await supabase.from("companies").update({ status: next }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await logAdminAction("company.status", "company", c.id, `${c.status} → ${next}`);
    void load();
  }

  const filtered = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (q && !`${r.name} ${r.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-3xl">Companies</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total · {filtered.length} shown</p>
        </div>
        {can.manageCompanies && <Button onClick={openCreate} className="rounded-xl gap-1"><Plus className="size-4" /> Add company</Button>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or category…" className="pl-9 rounded-xl" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => (
          <Card key={c.id} className="rounded-2xl">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div className="size-12 rounded-xl bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" /> : <Building2 className="size-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-48">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={c.status} />
                  <Badge variant="outline">{c.category}</Badge>
                </div>
                <h3 className="font-display text-lg leading-tight">{c.name}</h3>
                {c.location && <p className="text-xs text-muted-foreground">{c.location}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== "approved" && <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggleStatus(c, "approved")}>Activate</Button>}
                {c.status !== "rejected" && <Button size="sm" variant="outline" className="rounded-xl" onClick={() => toggleStatus(c, "rejected")}>Deactivate</Button>}
                {can.manageCompanies && <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => openEdit(c)}><Pencil className="size-3" /> Edit</Button>}
                {can.deleteCompanies && <Button size="sm" variant="destructive" className="rounded-xl gap-1" onClick={() => setConfirmDelete(c)}><Trash2 className="size-3" /> Delete</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No companies match.</p>}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={creating || !!editing} onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); }}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing ? "Edit company" : "Add company"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={200} /></Field>
            <Field label="Category *">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location"><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} /></Field>
            <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} maxLength={300} /></Field>
            <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={60} /></Field>
            <Field label="Email"><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} /></Field></div>
            <div className="sm:col-span-2"><Field label="Services"><Textarea rows={2} value={form.services ?? ""} onChange={(e) => setForm({ ...form, services: e.target.value })} maxLength={2000} /></Field></div>
            <div className="sm:col-span-2">
              <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Logo (PNG, JPG, WEBP · max 2MB)</Label>
              <div className="flex items-center gap-3 mt-1">
                {editing?.logo_url && !logoFile && <img src={editing.logo_url} className="size-14 rounded-xl object-cover bg-secondary" alt="" />}
                {logoFile && <div className="size-14 rounded-xl bg-secondary flex items-center justify-center"><ImagePlus className="size-5 text-muted-foreground" /></div>}
                <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="rounded-xl">{busy ? "Saving…" : editing ? "Save changes" : "Add company"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this company?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes "{confirmDelete?.name}" and its ratings/comments. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && remove(confirmDelete)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{label}</Label>
      {children}
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
