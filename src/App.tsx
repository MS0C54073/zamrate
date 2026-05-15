import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLayout from "./components/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import Companies from "./pages/admin/Companies";
import Comments from "./pages/admin/Comments";
import Reports from "./pages/admin/Reports";
import Suggestions from "./pages/admin/Suggestions";
import Recommendations from "./pages/admin/Recommendations";
import Users from "./pages/admin/Users";
import SubAdmins from "./pages/admin/SubAdmins";
import AuditLogs from "./pages/admin/AuditLogs";
import Settings from "./pages/admin/Settings";
import { AdminLockButton } from "./components/AdminLockButton";
import { SecrecyBackground } from "./components/SecrecyBackground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SecrecyBackground />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="companies" element={<Companies />} />
            <Route path="comments" element={<Comments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="suggestions" element={<Suggestions />} />
            <Route path="users" element={<Users />} />
            <Route path="sub-admins" element={<SubAdmins />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* Legacy redirect */}
          <Route path="/admin-dashboard" element={<Navigate to="/admin" replace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AdminLockButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
