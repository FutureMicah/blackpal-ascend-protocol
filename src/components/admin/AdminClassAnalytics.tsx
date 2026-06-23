import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, RefreshCw, AlertCircle, Smartphone, Tablet, Monitor,
  Timer, Repeat, TrendingUp, Activity,
} from "lucide-react";
import { format } from "date-fns";

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

export const AdminClassAnalytics = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const load = async () => {
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const { data, error: e } = await supabase
      .from("class_analytics_events" as any)
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (e) setError(e.message);
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [days]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sessionLoads = rows.filter(r => r.event_type === "session_load_ready");
    const retries = rows.filter(r => r.event_type === "retry").length;
    const errors = rows.filter(r => r.event_type === "error").length;
    const recoveries = rows.filter(r => r.event_type === "auto_recover").length;
    const skeletons = rows.filter(r => r.event_type === "skeleton_dismissed" && r.duration_ms);
    const avgSkeletonMs = skeletons.length
      ? Math.round(skeletons.reduce((s, r) => s + (r.duration_ms || 0), 0) / skeletons.length)
      : 0;
    const p95SkeletonMs = (() => {
      if (!skeletons.length) return 0;
      const arr = skeletons.map(s => s.duration_ms || 0).sort((a, b) => a - b);
      return arr[Math.floor(arr.length * 0.95)] || 0;
    })();

    // Retry rate by breakpoint
    const byBp: Record<string, { loads: number; retries: number; errors: number }> = {};
    rows.forEach(r => {
      const bp = r.breakpoint || "?";
      byBp[bp] ||= { loads: 0, retries: 0, errors: 0 };
      if (r.event_type === "session_load_ready") byBp[bp].loads++;
      if (r.event_type === "retry") byBp[bp].retries++;
      if (r.event_type === "error") byBp[bp].errors++;
    });

    const byOrientation: Record<string, number> = {};
    rows.forEach(r => {
      if (r.event_type === "retry" || r.event_type === "error") {
        const k = r.orientation || "?";
        byOrientation[k] = (byOrientation[k] || 0) + 1;
      }
    });

    return { total, sessionLoadCount: sessionLoads.length, retries, errors, recoveries, avgSkeletonMs, p95SkeletonMs, byBp, byOrientation };
  }, [rows]);

  if (loading) {
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
        <div className="flex items-center gap-1">
          {[1, 7, 30].map(d => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)} className="h-8 text-xs">{d}d</Button>
          ))}
          <Button size="sm" variant="ghost" onClick={load} className="h-8 min-w-11" aria-label="Reload analytics">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
                  <div className="h-full bg-yellow-500" style={{ width: `${Math.min(100, retryRate)}%` }} />
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Errors/retries by orientation</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(stats.byOrientation).map(([o, n]) => (
            <Badge key={o} variant="outline" className="capitalize">{o}: {n}</Badge>
          ))}
          {Object.keys(stats.byOrientation).length === 0 && <p className="text-xs text-muted-foreground">No issues recorded.</p>}
        </div>
      </Card>

      {/* Recent events */}
      <Card className="p-3 bg-card/60 border-border">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recent events</p>
        <ScrollArea className="h-64">
          <div className="space-y-1 pr-2">
            {rows.slice(0, 100).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/40">
                <Badge variant={r.event_type === "error" ? "destructive" : r.event_type === "retry" ? "secondary" : "outline"} className="text-[9px]">
                  {r.event_type}
                </Badge>
                <span className="text-muted-foreground">{r.breakpoint}</span>
                <span className="text-muted-foreground">{r.orientation}</span>
                {r.duration_ms != null && <span className="font-mono text-primary">{r.duration_ms}ms</span>}
                {r.retry_count ? <span className="text-yellow-500">×{r.retry_count}</span> : null}
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
