import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface Log { id: string; admin_id: string; action: string; target_type: string | null; target_id: string | null; notes: string | null; created_at: string; }

export default function AuditLogs() {
  const [rows, setRows] = useState<Log[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows((data ?? []) as Log[]));
  }, []);

  const filtered = rows.filter((r) => !q || `${r.action} ${r.target_type ?? ""} ${r.notes ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Audit Logs</h1>
      <p className="text-sm text-muted-foreground mb-5">Last 500 admin actions.</p>

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, type, notes…" className="pl-9 rounded-xl" />
      </div>

      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id} className="rounded-2xl">
            <CardContent className="p-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline">{r.action}</Badge>
              {r.target_type && <span className="text-xs text-muted-foreground">{r.target_type} · <span className="font-mono">{r.target_id?.slice(0, 8)}</span></span>}
              {r.notes && <span className="text-xs">{r.notes}</span>}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
              <span className="text-xs font-mono text-muted-foreground">{r.admin_id.slice(0, 8)}…</span>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No logs yet.</p>}
      </div>
    </div>
  );
}
