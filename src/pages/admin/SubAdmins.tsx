import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, UserPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdmin, logAdminAction, type AdminRole } from "@/hooks/useAdmin";

interface RoleRow { id: string; user_id: string; role: AdminRole; created_at: string; }

const ROLE_OPTIONS: AdminRole[] = ["super_admin", "admin", "sub_admin", "moderator"];

export default function SubAdmins() {
  const { isSuperAdmin, session } = useAdmin();
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AdminRole>("moderator");
  const [confirmDel, setConfirmDel] = useState<RoleRow | null>(null);

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data, error } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows((data ?? []) as RoleRow[]);
  }

  async function add() {
    if (!userId.trim()) return toast.error("Enter a user ID");
    const { error } = await supabase.from("user_roles").insert({ user_id: userId.trim(), role });
    if (error) return toast.error(error.message);
    await logAdminAction("role.grant", "user_role", userId.trim(), role);
    toast.success(`Granted ${role}.`);
    setUserId(""); void load();
  }

  async function remove(r: RoleRow) {
    const { error } = await supabase.from("user_roles").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction("role.revoke", "user_role", r.user_id, r.role);
    toast.success("Role revoked.");
    setConfirmDel(null);
    void load();
  }

  async function changeRole(r: RoleRow, next: AdminRole) {
    if (r.role === next) return;
    const { error } = await supabase.from("user_roles").update({ role: next }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction("role.update", "user_role", r.user_id, `${r.role} → ${next}`);
    toast.success("Role updated.");
    void load();
  }

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="mx-auto size-10 text-muted-foreground mb-3" />
        <h1 className="font-display text-2xl mb-2">Super admins only</h1>
        <p className="text-sm text-muted-foreground">Only a super admin can manage other admin accounts.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Sub Admins</h1>
      <p className="text-sm text-muted-foreground mb-5">Manage admin roles. New admins must first sign up via the lock button.</p>

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-4">
          <h3 className="font-display text-lg mb-3 flex items-center gap-2"><UserPlus className="size-5" /> Grant a role</h3>
          <div className="grid sm:grid-cols-[1fr_200px_auto] gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">User ID (UUID from auth)</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-0000-0000-0000-…" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={add} className="rounded-xl">Grant</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: ask the new admin to sign up via the 🔒 lock button, then paste their User ID here.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.map((r) => {
          const isMe = session?.user.id === r.user_id;
          return (
            <Card key={r.id} className="rounded-2xl">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize">{r.role.replace("_", " ")}</Badge>
                    {isMe && <Badge>You</Badge>}
                  </div>
                  <p className="font-mono text-xs break-all">{r.user_id}</p>
                  <p className="text-xs text-muted-foreground mt-1">Granted {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <Select value={r.role} onValueChange={(v) => changeRole(r, v as AdminRole)} disabled={isMe}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="destructive" disabled={isMe} className="rounded-xl gap-1" onClick={() => setConfirmDel(r)}>
                  <Trash2 className="size-3" /> Revoke
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this role?</AlertDialogTitle>
            <AlertDialogDescription>The user will immediately lose this role's permissions.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && remove(confirmDel)}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
