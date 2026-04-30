import { Card, CardContent } from "@/components/ui/card";
import { useAdmin } from "@/hooks/useAdmin";

export default function Settings() {
  const { session, roles } = useAdmin();
  return (
    <div>
      <h1 className="font-display text-3xl mb-5">Settings</h1>
      <Card className="rounded-2xl max-w-xl">
        <CardContent className="p-5 space-y-3">
          <Row label="Email" value={session?.user.email ?? "—"} />
          <Row label="User ID" value={<span className="font-mono text-xs break-all">{session?.user.id}</span>} />
          <Row label="Roles" value={roles.length ? roles.map((r) => r.replace("_", " ")).join(", ") : "—"} />
          <p className="text-xs text-muted-foreground pt-3 border-t border-border">
            Password changes can be done by signing out and using the password reset flow on the public auth page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
      <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground w-32 shrink-0">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
