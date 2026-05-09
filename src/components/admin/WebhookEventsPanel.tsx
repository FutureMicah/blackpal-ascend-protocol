import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Bell } from "lucide-react";

interface EventRow {
  id: string;
  reference: string | null;
  event_type: string;
  signature_valid: boolean;
  prior_status: string | null;
  new_status: string | null;
  amount_minor: number | null;
  currency: string | null;
  error: string | null;
  created_at: string;
}

interface AlertRow {
  id: string;
  alert_type: string;
  severity: string;
  user_id: string | null;
  reference: string | null;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

export const WebhookEventsPanel = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: ev }, { data: al }] = await Promise.all([
      supabase
        .from("paystack_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setEvents((ev || []) as EventRow[]);
    setAlerts((al || []) as AlertRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-webhook-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "paystack_webhook_events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const ackAlert = async (id: string) => {
    await supabase
      .from("admin_alerts")
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq("id", id);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-primary" /> Admin Alerts
            {alerts.filter((a) => !a.acknowledged).length > 0 && (
              <Badge variant="destructive" className="text-[9px]">
                {alerts.filter((a) => !a.acknowledged).length} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No alerts.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border p-2 text-[11px] ${
                    a.acknowledged ? "border-border/40 bg-muted/10 opacity-60" : "border-orange-500/30 bg-orange-500/5"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="font-semibold">{a.alert_type}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{a.severity}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate">{a.message}</p>
                    <p className="text-[9px] text-muted-foreground/70">
                      {new Date(a.created_at).toLocaleString()}
                      {a.reference ? ` • ${a.reference}` : ""}
                    </p>
                  </div>
                  {!a.acknowledged && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => ackAlert(a.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Ack
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-primary" /> Paystack Webhook Log (last 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No webhook events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="text-muted-foreground">
                  <tr className="text-left border-b border-border">
                    <th className="py-1.5 pr-2">Time</th>
                    <th className="py-1.5 pr-2">Event</th>
                    <th className="py-1.5 pr-2">Sig</th>
                    <th className="py-1.5 pr-2">Reference</th>
                    <th className="py-1.5 pr-2">Status</th>
                    <th className="py-1.5">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-border/30">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="py-1.5 pr-2 font-mono">{e.event_type}</td>
                      <td className="py-1.5 pr-2">
                        {e.signature_valid ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-rose-400">✗</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 font-mono truncate max-w-[140px]">{e.reference ?? "—"}</td>
                      <td className="py-1.5 pr-2">
                        {e.prior_status ?? "—"} → {e.new_status ?? "—"}
                      </td>
                      <td className="py-1.5 text-rose-400">{e.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
