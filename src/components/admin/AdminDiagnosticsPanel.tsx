import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, CheckCircle2, XCircle, Loader2, Download, History } from "lucide-react";

interface Probe {
  label: string;
  ok: boolean | null;
  count: number | null;
  ms: number | null;
  error?: string;
  ranAt?: string;
}

interface RunRecord {
  ranAt: string;
  durationMs: number;
  probes: Probe[];
}

interface Props {
  adminUserId: string;
  adminRole: string | null;
  usersLoaded: number;
  paymentsLoaded: number;
}

export const AdminDiagnosticsPanel = ({ adminUserId, adminRole, usersLoaded, paymentsLoaded }: Props) => {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<any>(null);
  const [themeState, setThemeState] = useState<any>(null);

  const run = async () => {
    setRunning(true);
    const startedAll = performance.now();
    const tasks: Array<[string, () => Promise<{ count: number | null }>]> = [
      ["paystack_webhook_events", async () => {
        const { count, error } = await supabase
          .from("paystack_webhook_events")
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return { count: count ?? 0 };
      }],
      ["payment_status_transitions", async () => {
        const { count, error } = await supabase
          .from("paystack_webhook_events")
          .select("*", { count: "exact", head: true })
          .not("new_status", "is", null);
        if (error) throw error;
        return { count: count ?? 0 };
      }],
      ["admin_alerts (unack)", async () => {
        const { count, error } = await supabase
          .from("admin_alerts")
          .select("*", { count: "exact", head: true })
          .eq("acknowledged", false);
        if (error) throw error;
        return { count: count ?? 0 };
      }],
      ["payments", async () => {
        const { count, error } = await supabase.from("payments").select("*", { count: "exact", head: true });
        if (error) throw error;
        return { count: count ?? 0 };
      }],
      ["profiles", async () => {
        const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        if (error) throw error;
        return { count: count ?? 0 };
      }],
    ];

    const results: Probe[] = [];
    for (const [label, fn] of tasks) {
      const start = performance.now();
      try {
        const { count } = await fn();
        results.push({ label, ok: true, count, ms: Math.round(performance.now() - start), ranAt: new Date().toISOString() });
      } catch (e: any) {
        results.push({ label, ok: false, count: null, ms: Math.round(performance.now() - start), error: e?.message, ranAt: new Date().toISOString() });
      }
    }
    setProbes(results);
    setHistory((prev) => [
      { ranAt: new Date().toISOString(), durationMs: Math.round(performance.now() - startedAll), probes: results },
      ...prev,
    ].slice(0, 20));
    setRunning(false);
  };

  useEffect(() => {
    run();
    // Pick up current theme state if already applied
    setThemeState((window as any).__BLACKPAL_THEME__ ?? null);
    const onTheme = (e: Event) => setThemeState((e as CustomEvent).detail);
    window.addEventListener("blackpal:theme-applied", onTheme);
    const t = setInterval(() => {
      const err = (window as any).__ADMIN_LAST_ERROR__;
      if (err) setLastError(err);
    }, 1500);
    return () => {
      window.removeEventListener("blackpal:theme-applied", onTheme);
      clearInterval(t);
    };
  }, []);

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      adminRole,
      adminUserId,
      usersLoaded,
      paymentsLoaded,
      themeState,
      latest: probes,
      history,
      lastError,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const themeLabel = themeState?.theme?.background
    ? `${themeState.theme.background} · ${themeState.theme.accentColor || "default accent"}`
    : "(default / no theme applied)";

  return (
    <Card className="border-border bg-card/80 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-primary" /> Admin Diagnostics
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={exportJson} disabled={running || probes.length === 0}>
              <Download className="w-3 h-3 mr-1" /> Export JSON
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={run} disabled={running}>
              {running ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Re-run
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="rounded border border-border bg-muted/30 p-2">
            <p className="text-muted-foreground">Auth role</p>
            <p className="font-semibold">{adminRole ?? "—"}</p>
          </div>
          <div className="rounded border border-border bg-muted/30 p-2">
            <p className="text-muted-foreground">Admin user id</p>
            <p className="font-mono truncate" title={adminUserId}>{adminUserId || "—"}</p>
          </div>
          <div className="rounded border border-border bg-muted/30 p-2">
            <p className="text-muted-foreground">Users loaded</p>
            <p className="font-semibold">{usersLoaded}</p>
          </div>
          <div className="rounded border border-border bg-muted/30 p-2">
            <p className="text-muted-foreground">Payments loaded</p>
            <p className="font-semibold">{paymentsLoaded}</p>
          </div>
          <div className="rounded border border-border bg-muted/30 p-2 col-span-2 sm:col-span-4">
            <p className="text-muted-foreground">Active theme (from provider)</p>
            <p className="font-mono text-[10px] truncate" title={themeLabel}>{themeLabel}</p>
            {themeState?.appliedAt && (
              <p className="text-[9px] text-muted-foreground">applied {new Date(themeState.appliedAt).toLocaleTimeString()}</p>
            )}
          </div>
        </div>

        <div className="rounded border border-border bg-muted/20 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="py-1.5 px-2">Query</th>
                <th className="py-1.5 px-2">Status</th>
                <th className="py-1.5 px-2">Rows</th>
                <th className="py-1.5 px-2">Latency</th>
                <th className="py-1.5 px-2">Last run</th>
              </tr>
            </thead>
            <tbody>
              {probes.length === 0 ? (
                <tr><td colSpan={5} className="py-3 text-center text-muted-foreground">Running probes…</td></tr>
              ) : probes.map((p) => (
                <tr key={p.label} className="border-t border-border/40">
                  <td className="py-1.5 px-2 font-mono">{p.label}</td>
                  <td className="py-1.5 px-2">
                    {p.ok ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400" title={p.error}>
                        <XCircle className="w-3 h-3" /> {p.error?.slice(0, 40) || "fail"}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2">{p.count ?? "—"}</td>
                  <td className="py-1.5 px-2">{p.ms != null ? `${p.ms}ms` : "—"}</td>
                  <td className="py-1.5 px-2">{p.ranAt ? new Date(p.ranAt).toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {history.length > 0 && (
          <div className="rounded border border-border bg-muted/10 p-2">
            <p className="text-[11px] font-semibold flex items-center gap-1 mb-1">
              <History className="w-3 h-3" /> Probe run history ({history.length})
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {history.map((h, i) => {
                const okCount = h.probes.filter((p) => p.ok).length;
                const failCount = h.probes.length - okCount;
                return (
                  <div key={i} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-muted/30">
                    <span className="font-mono">{new Date(h.ranAt).toLocaleTimeString()}</span>
                    <span className="text-muted-foreground">{h.durationMs}ms</span>
                    <span className="text-emerald-400">{okCount} ok</span>
                    <span className={failCount ? "text-rose-400" : "text-muted-foreground"}>{failCount} fail</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lastError && (
          <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-[11px]">
            <p className="font-semibold text-destructive flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Last captured render error
            </p>
            <p className="font-mono mt-1 break-words">{lastError.message}</p>
            <p className="text-[10px] text-muted-foreground">at {new Date(lastError.at).toLocaleString()}</p>
            <Button size="sm" variant="ghost" className="mt-1 h-6 text-[10px]"
              onClick={() => { (window as any).__ADMIN_LAST_ERROR__ = null; setLastError(null); }}>
              Clear
            </Button>
          </div>
        )}

        {!lastError && (
          <Badge variant="outline" className="text-[10px]">No render errors captured this session</Badge>
        )}
      </CardContent>
    </Card>
  );
};
