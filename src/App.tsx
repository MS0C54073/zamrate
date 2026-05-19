import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import { AdminLockButton } from "./components/AdminLockButton";
import { SecrecyBackground } from "./components/SecrecyBackground";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Overview = lazy(() => import("./pages/admin/Overview"));
const Companies = lazy(() => import("./pages/admin/Companies"));
const Comments = lazy(() => import("./pages/admin/Comments"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Suggestions = lazy(() => import("./pages/admin/Suggestions"));
const Recommendations = lazy(() => import("./pages/admin/Recommendations"));
const Users = lazy(() => import("./pages/admin/Users"));
const SubAdmins = lazy(() => import("./pages/admin/SubAdmins"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const Settings = lazy(() => import("./pages/admin/Settings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const Fallback = () => (
  <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Loading…</div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SecrecyBackground />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="companies" element={<Companies />} />
              <Route path="comments" element={<Comments />} />
              <Route path="reports" element={<Reports />} />
              <Route path="suggestions" element={<Suggestions />} />
              <Route path="recommendations" element={<Recommendations />} />
              <Route path="users" element={<Users />} />
              <Route path="sub-admins" element={<SubAdmins />} />
              <Route path="audit" element={<AuditLogs />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <AdminLockButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
