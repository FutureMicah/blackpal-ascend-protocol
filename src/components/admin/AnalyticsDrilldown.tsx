import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Video, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type Row = any;

/** Shows session-level roll-ups + raw events for a specific spike bucket (bp/or + kind). */
export const AnalyticsDrilldown = ({
  rows, breakpoint, orientation, kind, onClose,
}: {
  rows: Row[];
  breakpoint?: string | null;
  orientation?: string | null;
  kind: "retry" | "error";
  onClose: () => void;
}) => {
  const filtered = useMemo(() => rows.filter(r =>
    (!breakpoint || r.breakpoint === breakpoint) &&
    (!orientation || r.orientation === orientation)
  ), [rows, breakpoint, orientation]);

  const sessions = useMemo(() => {
    const map = new Map<string, { session_id: string; course_id: string | null; loads: number; retries: number; errors: number; last: string }>();
    filtered.forEach(r => {
      const key = r.session_id || "(no session)";
      const s = map.get(key) || { session_id: key, course_id: r.course_id, loads: 0, retries: 0, errors: 0, last: r.created_at };
      if (r.event_type === "session_load_ready") s.loads++;
      if (r.event_type === "retry") s.retries++;
      if (r.event_type === "error") s.errors++;
      if (r.created_at > s.last) s.last = r.created_at;
      map.set(key, s);
    });
    return Array.from(map.values())
      .filter(s => (kind === "retry" ? s.retries : s.errors) > 0)
      .sort((a, b) => (kind === "retry" ? b.retries - a.retries : b.errors - a.errors));
  }, [filtered, kind]);

  const [openSession, setOpenSession] = useState<string | null>(null);
  const [sessionMeta, setSessionMeta] = useState<Record<string, any>>({});

  useEffect(() => {
    const ids = sessions.map(s => s.session_id).filter(id => id && id !== "(no session)");
    if (!ids.length) return;
    supabase.from("class_live_sessions" as any).select("id,title,starts_at,status,provider").in("id", ids)
      .then(({ data }) => {
        const map: Record<string, any> = {};
        (data || []).forEach((r: any) => { map[r.id] = r; });
        setSessionMeta(map);
      });
  }, [sessions]);

  const openRows = useMemo(
    () => openSession ? filtered.filter(r => (r.session_id || "(no session)") === openSession).slice(0, 200) : [],
    [openSession, filtered]
  );

  return (
    <Card className="p-3 bg-card/80 border-primary/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-widest text-primary">
            Drill-down · {kind} {breakpoint ? `· bp=${breakpoint}` : ""} {orientation ? `· ${orientation}` : ""}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0" aria-label="Close drill-down">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {sessions.length} session{sessions.length === 1 ? "" : "s"} · {filtered.length} events in scope
      </p>

      <ScrollArea className="max-h-72">
        <div className="space-y-1 pr-2">
          {sessions.slice(0, 100).map(s => {
            const meta = sessionMeta[s.session_id];
            const open = openSession === s.session_id;
            return (
              <div key={s.session_id} className="border border-border/40 rounded">
                <button
                  onClick={() => setOpenSession(open ? null : s.session_id)}
                  className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/30 transition-colors"
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {meta?.title || (s.session_id === "(no session)" ? "Non-session events" : s.session_id.slice(0, 8))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {meta?.starts_at ? format(new Date(meta.starts_at), "MMM d HH:mm") : format(new Date(s.last), "MMM d HH:mm")}
                      {meta?.provider ? ` · ${meta.provider}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px]">{s.loads} loads</Badge>
                    {s.retries > 0 && <Badge variant="secondary" className="text-[9px]">{s.retries} retries</Badge>}
                    {s.errors > 0 && <Badge variant="destructive" className="text-[9px]">{s.errors} errors</Badge>}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border/40 max-h-48 overflow-y-auto">
                    {openRows.map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-[10px] px-2 py-1 border-b border-border/20">
                        <Badge variant={r.event_type === "error" ? "destructive" : r.event_type === "retry" ? "secondary" : "outline"} className="text-[9px]">
                          {r.event_type}
                        </Badge>
                        <span className="text-muted-foreground">{r.breakpoint}/{r.orientation}</span>
                        {r.duration_ms != null && <span className="font-mono text-primary">{r.duration_ms}ms</span>}
                        {r.retry_count ? <span className="text-yellow-500">×{r.retry_count}</span> : null} {/* color-audit-allow status */}
                        <span className="ml-auto text-muted-foreground">{format(new Date(r.created_at), "MMM d HH:mm:ss")}</span>
                      </div>
                    ))}
                    {openRows.length === 0 && <p className="text-[10px] text-muted-foreground p-2">No events.</p>}
                  </div>
                )}
              </div>
            );
          })}
          {sessions.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No sessions matched this spike.</p>}
        </div>
      </ScrollArea>
    </Card>
  );
};
