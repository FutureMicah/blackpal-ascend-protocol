import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

type Row = {
  id: string;
  signature: string;
  kind: string;
  breakpoint: string | null;
  orientation: string | null;
  rate: number;
  loads: number;
  channels: string[];
  attempted_channels: string[] | null;
  errors: { channel: string; error: string; attempts: number; status: number }[] | null;
  status: string | null;
  sent_at: string;
};

const STATUS: Record<string, { label: string; variant: "default" | "destructive" | "secondary"; icon: any }> = {
  sent:    { label: "Sent",    variant: "default",     icon: CheckCircle2 },
  partial: { label: "Partial", variant: "secondary",   icon: AlertTriangle },
  failed:  { label: "Failed",  variant: "destructive", icon: AlertCircle },
};

export const AdminAnalyticsAlertsLog = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "partial">("all");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("class_analytics_alerts_sent" as any)
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  return (
    <Card className="p-3 bg-card/60 border-border space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Alert dispatch log</p>
        </div>
        <div className="flex items-center gap-1">
          {(["all", "failed", "partial"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)} className="h-7 text-[10px] capitalize">{f}</Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load} className="h-7 w-7 p-0" aria-label="Reload log">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {loading && <p className="text-[11px] text-muted-foreground">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No dispatch attempts recorded yet.</p>
      )}
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {rows.map(r => {
          const s = STATUS[r.status || "sent"] || STATUS.sent;
          const Icon = s.icon;
          return (
            <div key={r.id} className="text-[11px] p-2 rounded border border-border/40 bg-background/40">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <Badge variant={s.variant} className="text-[9px]">{s.label}</Badge>
                  <span className="font-mono">{r.kind}</span>
                  <span className="text-muted-foreground">
                    {r.breakpoint ? `bp=${r.breakpoint}` : ""}{r.orientation ? ` or=${r.orientation}` : ""}
                    {!r.breakpoint && !r.orientation ? "global" : ""}
                  </span>
                  <span>· {(Number(r.rate) * 100).toFixed(0)}% · {r.loads} loads</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(r.sent_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px]">
                {(r.attempted_channels || r.channels || []).map(c => (
                  <Badge key={c} variant={r.channels?.includes(c) ? "outline" : "destructive"} className="text-[9px]">
                    {c}{r.channels?.includes(c) ? " ✓" : " ✗"}
                  </Badge>
                ))}
              </div>
              {r.errors && r.errors.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {r.errors.map((e, i) => (
                    <p key={i} className="text-[10px] text-destructive font-mono truncate">
                      {e.channel}: {e.error} ({e.attempts} attempt{e.attempts === 1 ? "" : "s"})
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
