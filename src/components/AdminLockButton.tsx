import { Link } from "react-router-dom";
import { Lock, Shield } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";

export function AdminLockButton() {
  const { isAdmin, session } = useAdmin();
  const target = session && isAdmin ? "/admin" : "/admin-login";
  const Icon = isAdmin ? Shield : Lock;
  return (
    <Link
      to={target}
      title={isAdmin ? "Open admin dashboard" : "Admin login"}
      className="fixed bottom-5 right-5 z-50 size-12 rounded-full bg-foreground text-background shadow-card flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Admin"
    >
      <Icon className="size-5" />
    </Link>
  );
}
