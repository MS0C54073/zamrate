import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AdminRole = "super_admin" | "admin" | "sub_admin" | "moderator";

export function useAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) setTimeout(() => void loadRoles(s.user.id), 0);
      else { setRoles([]); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadRoles(data.session.user.id);
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as AdminRole));
    setLoading(false);
  }

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isSubAdmin = isAdmin || roles.includes("sub_admin");
  const isModerator = isAdmin || roles.includes("moderator");
  const isAdminTier = isSuperAdmin || isAdmin || roles.includes("sub_admin") || roles.includes("moderator");

  // Permission helpers
  const can = {
    manageCompanies: isAdmin,            // add/edit/delete companies
    deleteCompanies: isAdmin,
    manageComments: isModerator || isSubAdmin, // approve/reject/delete
    deleteComments: isModerator || isAdmin,
    viewReports: isSubAdmin,
    reviewReports: isSubAdmin,
    blockUsers: isAdmin,
    viewUsers: isAdmin,
    manageSubAdmins: isSuperAdmin,
    viewAuditLogs: isAdmin,
    approveSuggestions: isSubAdmin,
    deleteSuggestions: isAdmin,
  };

  return { session, roles, isSuperAdmin, isAdmin, isSubAdmin, isModerator, isAdminTier, loading, can };
}

/** Log an admin action to the audit table. Best-effort; never throws. */
export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  notes?: string,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      notes: notes ?? null,
    });
  } catch {
    // swallow — audit must never break the user action
  }
}
