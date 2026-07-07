import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { getAnonId } from "@/lib/anonId";
import { toast } from "sonner";
import { Plus, ImagePlus, X } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().trim().min(2).max(200),
  category: z.string().min(1),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  services: z.string().trim().max(500).optional().or(z.literal("")),
});

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function SuggestCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", category: "", description: "", services: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickLogo(f: File | null) {
    if (!f) { setLogoFile(null); setLogoPreview(null); return; }
    if (!ALLOWED.includes(f.type)) return toast.error("Logo must be PNG, JPG or WEBP");
    if (f.size > MAX_BYTES) return toast.error("Logo must be under 2MB");
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoFile) return null;
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `suggestions/${getAnonId()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("company-logos").upload(path, logoFile, {
      upsert: false, contentType: logoFile.type,
    });
    if (error) { toast.error(`Logo upload failed: ${error.message}`); return null; }
    return supabase.storage.from("company-logos").getPublicUrl(path).data.publicUrl;
  }

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Please complete the required fields correctly.");
      return;
    }
    setSubmitting(true);
    let logo_url: string | null = null;
    if (logoFile) {
      logo_url = await uploadLogo();
      if (!logo_url) { setSubmitting(false); return; }
    }
    const { error } = await supabase.from("company_suggestions").insert({
      company_name: parsed.data.company_name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      services: parsed.data.services || null,
      logo_url,
      suggested_by_anonymous_user_id: getAnonId(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thank you! Your suggestion is pending review.");
    setForm({ company_name: "", category: "", description: "", services: "" });
    setLogoFile(null); setLogoPreview(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-foreground hover:bg-clay text-background gap-2">
          <Plus className="size-4" /> Suggest Company
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Suggest a company</DialogTitle>
          <DialogDescription>Help expand the registry. Submissions are reviewed before going public.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Company name *" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="rounded-xl" />
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category *" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" maxLength={500} />
          <Textarea placeholder="Services offered" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} className="rounded-xl" maxLength={500} />

          <div className="rounded-xl border border-dashed border-border/70 p-3">
            <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Company logo (optional · PNG/JPG/WEBP · max 2MB)</Label>
            <div className="flex items-center gap-3 mt-2">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Logo preview" className="size-14 rounded-xl object-contain bg-secondary p-1" />
                  <button
                    type="button"
                    onClick={() => pickLogo(null)}
                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center"
                    aria-label="Remove logo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="size-14 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:bg-secondary/70"
                >
                  <ImagePlus className="size-5" />
                </button>
              )}
              <Input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting} className="rounded-xl">
              {submitting ? "Submitting…" : "Submit Suggestion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
