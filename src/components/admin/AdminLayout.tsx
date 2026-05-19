import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Building2, MessagesSquare, Flag, Lightbulb, Users, ShieldCheck,
  ScrollText, Settings, LogOut, Shield, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "any" },
  { to: "/admin/companies", label: "Companies", icon: Building2, perm: "manageCompanies" },
  { to: "/admin/reports", label: "Reported Comments", icon: Flag, perm: "reviewReports" },
  { to: "/admin/suggestions", label: "Suggestions", icon: Lightbulb, perm: "approveSuggestions" },
  { to: "/admin/recommendations", label: "Recommendations", icon: Lightbulb, perm: "any" },
  { to: "/admin/users", label: "Users", icon: Users, perm: "viewUsers" },
  { to: "/admin/sub-admins", label: "Sub Admins", icon: ShieldCheck, perm: "manageSubAdmins" },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText, perm: "viewAuditLogs" },
  { to: "/admin/settings", label: "Settings", icon: Settings, perm: "any" },
] as const;

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { can, isAdminTier } = useAdmin();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`px-3 py-4 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <img src="/favicon.png" alt="ZamRate" className="size-9 rounded-xl object-cover shrink-0 shadow-card" />
          {!collapsed && <div className="font-display text-lg leading-tight">ZamRate<br/><span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Admin</span></div>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Moderation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const allowed = item.perm === "any" || isAdminTier && (can as any)[item.perm];
                if (!allowed) return null;
                const active = pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.to} end className="flex items-center gap-2">
                        <item.icon className="size-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const nav = useNavigate();
  const { session, isAdminTier, loading, roles } = useAdmin();

  useEffect(() => {
    if (loading) return;
    if (!session) nav("/admin-login");
  }, [loading, session, nav]);

  async function signOut() {
    await supabase.auth.signOut();
    nav("/");
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!session) return null;

  if (!isAdminTier) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <div className="mx-auto size-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center">
            <Shield className="size-7" />
          </div>
          <h1 className="font-display text-2xl">Not authorized</h1>
          <p className="text-sm text-muted-foreground">
            Your account ({session.user.email}) has no admin role assigned.
          </p>
          <Button onClick={signOut} variant="outline" className="rounded-xl">Sign out</Button>
        </div>
      </div>
    );
  }

  const primaryRole = roles[0] ?? "user";

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-accent/20 bg-card flex items-center px-3 sm:px-5 gap-3">
            <SidebarTrigger className="text-foreground"><Menu className="size-4" /></SidebarTrigger>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                Signed in as <span className="font-semibold text-foreground">{session.user.email}</span> · <span className="uppercase tracking-widest">{primaryRole.replace("_", " ")}</span>
              </p>
            </div>
            <Button onClick={signOut} variant="outline" size="sm" className="rounded-xl gap-1">
              <LogOut className="size-4" /> Sign out
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
