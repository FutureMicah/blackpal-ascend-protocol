import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3, RefreshCw, AlertCircle, Smartphone, Tablet, Monitor,
  Timer, Repeat, TrendingUp, Activity, Download, ShieldAlert, Shield, Trash2, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Row = {
  id: string;
  event_type: string;
  course_id: string | null;
  session_id: string | null;
  user_id: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  orientation: string | null;
  breakpoint: string | null;
  user_agent: string | null;
  duration_ms: number | null;
  retry_count: number | null;
  meta: any;
  created_at: string;
};

const BP_ICON: Record<string, any> = { xs: Smartphone, sm: Smartphone, md: Tablet, lg: Monitor, xl: Monitor };
const ALL_BPS = ["xs", "sm", "md", "lg", "xl"];
const ALL_ORS = ["portrait", "landscape"];

// Spike thresholds (per breakpoint/orientation, over selected window)
const SPIKE_RETRY_RATE = 0.20;   // >20% retries per session load
const SPIKE_ERROR_RATE = 0.10;   // >10% errors per session load
const SPIKE_MIN_LOADS = 5;       // avoid alarms on tiny samples

const toCsv = (rows: Record<string, any>[]) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
};

const download = (name: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 200);
};

const isoDaysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);

export const AdminClassAnalytics = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(isoDaysAgo(7));
  const [to, setTo] = useState<string>(todayIso());
  const [bpFilter, setBpFilter] = useState<Set<string>>(new Set());
  const [orFilter, setOrFilter] = useState<Set<string>>(new Set());
  const [retention, setRetention] = useState<number>(90);
  const [retentionInput, setRetentionInput] = useState<string>("90");
  const [savingRet, setSavingRet] = useState(false);
  const [purging, setPurging] = useState(false);
  const seenAlertsRef = useRef<Set<string>>(new Set());
  const [drill, setDrill] = useState<{ breakpoint: string | null; orientation: string | null; kind: "retry" | "error" } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const fromIso = new Date(from + "T00:00:00").toISOString();
    const toIso = new Date(to + "T23:59:59").toISOString();
    let q = supabase
      .from("class_analytics_events" as any)
      .select("*")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (bpFilter.size) q = q.in("breakpoint", Array.from(bpFilter));
    if (orFilter.size) q = q.in("orientation", Array.from(orFilter));
    const { data, error: e } = await q;
    if (e) setError(e.message);
    setRows((data || []) as any);
    setLoading(false);
  };

  const loadRetention = async () => {
    const { data } = await supabase.rpc("get_class_analytics_retention" as any);
    if (typeof data === "number") { setRetention(data); setRetentionInput(String(data)); }
  };

  useEffect(() => { load(); }, [from, to, bpFilter, orFilter]);
  useEffect(() => { loadRetention(); }, []);

  // Realtime — append new events into the current view (if they match filters)
  useEffect(() => {
    const ch = supabase
      .channel("admin-class-analytics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "class_analytics_events" }, (payload) => {
        const r = payload.new as Row;
        if (bpFilter.size && !bpFilter.has(r.breakpoint || "")) return;
        if (orFilter.size && !orFilter.has(r.orientation || "")) return;
        setRows(prev => [r, ...prev].slice(0, 5000));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bpFilter, orFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sessionLoads = rows.filter(r => r.event_type === "session_load_ready");
    const retries = rows.filter(r => r.event_type === "retry").length;
    const errors = rows.filter(r => r.event_type === "error").length;
    const recoveries = rows.filter(r => r.event_type === "auto_recover").length;
    const skeletons = rows.filter(r => r.event_type === "skeleton_dismissed" && r.duration_ms);
    const avgSkeletonMs = skeletons.length
      ? Math.round(skeletons.reduce((s, r) => s + (r.duration_ms || 0), 0) / skeletons.length) : 0;
    const p95SkeletonMs = (() => {
      if (!skeletons.length) return 0;
      const arr = skeletons.map(s => s.duration_ms || 0).sort((a, b) => a - b);
      return arr[Math.floor(arr.length * 0.95)] || 0;
    })();

    const byBp: Record<string, { loads: number; retries: number; errors: number }> = {};
    const byOr: Record<string, { loads: number; retries: number; errors: number }> = {};
    rows.forEach(r => {
      const bp = r.breakpoint || "?";
      byBp[bp] ||= { loads: 0, retries: 0, errors: 0 };
      if (r.event_type === "session_load_ready") byBp[bp].loads++;
      if (r.event_type === "retry") byBp[bp].retries++;
      if (r.event_type === "error") byBp[bp].errors++;

      const or = r.orientation || "?";
      byOr[or] ||= { loads: 0, retries: 0, errors: 0 };
      if (r.event_type === "session_load_ready") byOr[or].loads++;
      if (r.event_type === "retry") byOr[or].retries++;
      if (r.event_type === "error") byOr[or].errors++;
    });

    // Spike detection
    type Spike = { key: string; kind: "retry" | "error"; rate: number; loads: number; breakpoint: string | null; orientation: string | null };
    const spikes: Spike[] = [];
    const check = (label: string, s: { loads: number; retries: number; errors: number }, bp: string | null, or: string | null) => {
      if (s.loads < SPIKE_MIN_LOADS) return;
      const rr = s.retries / s.loads;
      const er = s.errors / s.loads;
      if (rr >= SPIKE_RETRY_RATE) spikes.push({ key: label, kind: "retry", rate: rr, loads: s.loads, breakpoint: bp, orientation: or });
      if (er >= SPIKE_ERROR_RATE) spikes.push({ key: label, kind: "error", rate: er, loads: s.loads, breakpoint: bp, orientation: or });
    };
    Object.entries(byBp).forEach(([k, s]) => check(`bp:${k}`, s, k, null));
    Object.entries(byOr).forEach(([k, s]) => check(`or:${k}`, s, null, k));

    return { total, sessionLoadCount: sessionLoads.length, retries, errors, recoveries, avgSkeletonMs, p95SkeletonMs, byBp, byOr, spikes };
  }, [rows]);

  // Fire toast + server dispatch for freshly-detected spikes
  useEffect(() => {
    const fresh: any[] = [];
    stats.spikes.forEach(sp => {
      const sig = `${from}|${to}|${sp.key}|${sp.kind}|${Math.round(sp.rate * 100)}`;
      if (seenAlertsRef.current.has(sig)) return;
      seenAlertsRef.current.add(sig);
      toast.warning(`Spike: ${sp.kind} rate ${(sp.rate * 100).toFixed(0)}% on ${sp.key}`, {
        description: `${sp.loads} session loads in window`,
      });
      fresh.push({ kind: sp.kind, breakpoint: sp.breakpoint, orientation: sp.orientation, rate: sp.rate, loads: sp.loads });
    });
    if (fresh.length) {
      supabase.functions.invoke("dispatch-analytics-alert", { body: { spikes: fresh } }).catch(() => {});
    }
  }, [stats.spikes, from, to]);

  const exportEvents = () => {
    const flat = rows.map(r => ({ ...r, meta: r.meta ? JSON.stringify(r.meta) : "" }));
    download(`class-analytics-events_${from}_to_${to}.csv`, toCsv(flat));
  };
  const exportKpis = () => {
    const kpi = [
      { metric: "events", value: stats.total },
      { metric: "session_loads", value: stats.sessionLoadCount },
      { metric: "retries", value: stats.retries },
      { metric: "errors", value: stats.errors },
      { metric: "auto_recoveries", value: stats.recoveries },
      { metric: "avg_skeleton_ms", value: stats.avgSkeletonMs },
      { metric: "p95_skeleton_ms", value: stats.p95SkeletonMs },
      { metric: "error_rate_pct", value: stats.sessionLoadCount ? Math.round((stats.errors / stats.sessionLoadCount) * 100) : 0 },
      ...Object.entries(stats.byBp).map(([k, s]) => ({ metric: `bp_${k}`, value: `loads=${s.loads};retries=${s.retries};errors=${s.errors}` })),
      ...Object.entries(stats.byOr).map(([k, s]) => ({ metric: `or_${k}`, value: `loads=${s.loads};retries=${s.retries};errors=${s.errors}` })),
    ];
    download(`class-analytics-kpis_${from}_to_${to}.csv`, toCsv(kpi));
  };

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const saveRetention = async () => {
    const n = Number(retentionInput);
    if (!Number.isFinite(n) || n < 1 || n > 3650) { toast.error("Retention must be 1–3650 days"); return; }
    setSavingRet(true);
    const { data, error } = await supabase.rpc("set_class_analytics_retention" as any, { _days: n });
    setSavingRet(false);
    if (error) return toast.error(error.message);
    setRetention(Number(data));
    toast.success(`Retention set to ${data} days`);
  };
  const purgeNow = async () => {
    if (!confirm(`Delete all class analytics events older than ${retention} days? This cannot be undone.`)) return;
    setPurging(true);
    const { data, error } = await supabase.rpc("purge_class_analytics" as any, { _days: retention });
    setPurging(false);
    if (error) return toast.error(error.message);
    toast.success(`Purged ${data} row${data === 1 ? "" : "s"}`);
    load();
  };

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={load} size="lg" className="min-h-11"><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Class & Live Session Analytics</h3>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={exportKpis} className="h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />KPIs CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportEvents} className="h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />Events CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={load} className="h-8 min-w-11" aria-label="Reload analytics">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-card/60 border-border space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground">From</Label>
            <Input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="h-8 text-xs w-[140px]" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground">To</Label>
            <Input type="date" value={to} min={from} max={todayIso()} onChange={e => setTo(e.target.value)} className="h-8 text-xs w-[140px]" />
          </div>
          <div className="flex items-center gap-1">
            {[1, 7, 30, 90].map(d => (
              <Button key={d} size="sm" variant="outline" className="h-8 text-xs"
                onClick={() => { setFrom(isoDaysAgo(d)); setTo(todayIso()); }}>{d}d</Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase text-muted-foreground">Breakpoint</span>
          {ALL_BPS.map(bp => (
            <Button key={bp} size="sm" variant={bpFilter.has(bp) ? "default" : "outline"}
              onClick={() => toggle(bpFilter, bp, setBpFilter)} className="h-7 text-[11px] font-mono">{bp}</Button>
          ))}
          <span className="text-[10px] uppercase text-muted-foreground ml-2">Orientation</span>
          {ALL_ORS.map(o => (
            <Button key={o} size="sm" variant={orFilter.has(o) ? "default" : "outline"}
              onClick={() => toggle(orFilter, o, setOrFilter)} className="h-7 text-[11px] capitalize">{o}</Button>
          ))}
          {(bpFilter.size > 0 || orFilter.size > 0) && (
            <Button size="sm" variant="ghost" className="h-7 text-[11px]"
              onClick={() => { setBpFilter(new Set()); setOrFilter(new Set()); }}>Clear</Button>
          )}
        </div>
      </Card>

      {/* Spike alerts */}
      {stats.spikes.length > 0 && (
        <Card className="p-3 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <p className="text-xs font-semibold text-destructive uppercase tracking-widest">
              {stats.spikes.length} live alert{stats.spikes.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.spikes.map((s, i) => (
              <button key={i} onClick={() => setDrill({ breakpoint: s.breakpoint, orientation: s.orientation, kind: s.kind })}
                className="focus:outline-none focus:ring-2 focus:ring-primary rounded" aria-label={`Drill into ${s.key} ${s.kind} spike`}>
                <Badge variant="destructive" className="text-[10px] cursor-pointer hover:opacity-80">
                  {s.kind === "retry" ? "Retry" : "Error"} {(s.rate * 100).toFixed(0)}% · {s.key} ({s.loads} loads) →
                </Badge>
              </button>
            ))}
          </div>
          {drill && (
            <div className="mt-3">
              <AnalyticsDrilldown rows={rows} breakpoint={drill.breakpoint} orientation={drill.orientation}
                kind={drill.kind} onClose={() => setDrill(null)} />
            </div>
          )}
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi icon={Activity} label="Events" value={stats.total} />
        <Kpi icon={TrendingUp} label="Session loads" value={stats.sessionLoadCount} />
        <Kpi icon={Repeat} label="Retries" value={stats.retries} accent={stats.retries > 0 ? "warning" : undefined} />
        <Kpi icon={AlertCircle} label="Errors" value={stats.errors} accent={stats.errors > 0 ? "destructive" : undefined} />
        <Kpi icon={Timer} label="Avg skeleton" value={`${stats.avgSkeletonMs}ms`} />
        <Kpi icon={Timer} label="P95 skeleton" value={`${stats.p95SkeletonMs}ms`} />
        <Kpi icon={RefreshCw} label="Auto-recoveries" value={stats.recoveries} />
        <Kpi icon={AlertCircle} label="Error rate" value={stats.sessionLoadCount ? `${Math.round((stats.errors / stats.sessionLoadCount) * 100)}%` : "0%"} />
      </div>

      {/* Breakpoint breakdown */}
      <Card className="p-3 bg-card/60 border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Retries & errors by breakpoint</p>
        <div className="space-y-2">
          {Object.entries(stats.byBp).sort().map(([bp, s]) => {
            const Icon = BP_ICON[bp] || Smartphone;
            const retryRate = s.loads ? Math.round((s.retries / Math.max(s.loads, 1)) * 100) : 0;
            return (
              <div key={bp} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono w-8">{bp}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, retryRate)}%` }} /> {/* color-audit-allow status */}
                </div>
                <span className="text-[10px] text-muted-foreground w-32 text-right">
                  {s.loads} loads · {s.retries} retries · {s.errors} errors
                </span>
              </div>
            );
          })}
          {Object.keys(stats.byBp).length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
        </div>
      </Card>

      {/* Orientation */}
      <Card className="p-3 bg-card/60 border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">By orientation (loads · retries · errors)</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(stats.byOr).map(([o, s]) => (
            <Badge key={o} variant="outline" className="capitalize">
              {o}: {s.loads} · {s.retries} · {s.errors}
            </Badge>
          ))}
          {Object.keys(stats.byOr).length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
        </div>
      </Card>

      {/* Retention & privacy */}
      <Card className="p-3 bg-card/60 border-border space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Retention & privacy</p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Analytics events are visible to admins only. Rows older than the retention window are
          automatically deleted daily. User agents are truncated to 256 chars; no message bodies are stored.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Retention (days)</Label>
            <Input type="number" min={1} max={3650} value={retentionInput}
              onChange={e => setRetentionInput(e.target.value)} className="h-8 w-28 text-xs" />
          </div>
          <Button size="sm" onClick={saveRetention} disabled={savingRet} className="h-8 text-xs">
            {savingRet ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={purgeNow} disabled={purging} className="h-8 text-xs">
            <Trash2 className="w-3.5 h-3.5 mr-1" />{purging ? "Purging…" : `Purge older than ${retention}d`}
          </Button>
          <span className="text-[10px] text-muted-foreground">Current: {retention} days</span>
        </div>
      </Card>

      {/* Recent events */}
      <Card className="p-3 bg-card/60 border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recent events ({rows.length})</p>
        <ScrollArea className="h-64">
          <div className="space-y-1 pr-2">
            {rows.slice(0, 200).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/40">
                <Badge variant={r.event_type === "error" ? "destructive" : r.event_type === "retry" ? "secondary" : "outline"} className="text-[9px]">
                  {r.event_type}
                </Badge>
                <span className="text-muted-foreground">{r.breakpoint}</span>
                <span className="text-muted-foreground">{r.orientation}</span>
                {r.duration_ms != null && <span className="font-mono text-primary">{r.duration_ms}ms</span>}
                {r.retry_count ? <span className="text-yellow-500">×{r.retry_count}</span> : null} {/* color-audit-allow status */}
                <span className="ml-auto text-muted-foreground">{format(new Date(r.created_at), "MMM d HH:mm:ss")}</span>
              </div>
            ))}
            {rows.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No analytics events recorded.</p>}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

const Kpi = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: "warning" | "destructive" }) => (
  <Card className={`p-2.5 bg-card/60 border-border ${accent === "destructive" ? "border-destructive/40" : accent === "warning" ? "border-yellow-500/40" : ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
      <Icon className="w-3 h-3" />{label}
    </div>
    <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
  </Card>
);
