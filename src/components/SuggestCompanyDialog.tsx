import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { getAnonId } from "@/lib/anonId";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  company_name: z.string().trim().min(2).max(200),
  category: z.string().min(1),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  services: z.string().trim().max(500).optional().or(z.literal("")),
});

export function SuggestCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", category: "", description: "", services: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error("Please complete the required fields correctly.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("company_suggestions").insert({
      company_name: parsed.data.company_name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      services: parsed.data.services || null,
      suggested_by_anonymous_user_id: getAnonId(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thank you! Your suggestion is pending review.");
    setForm({ company_name: "", category: "", description: "", services: "" });
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
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting} className="rounded-xl">Submit Suggestion</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
