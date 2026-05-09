// Live event log that listens for `blackpal:rate-refresh` and `blackpal:atlas-refresh`
// CustomEvents and displays them in a scrollable panel. Used to verify that data
// is updating in real time without page reloads.
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadRealtimeReport } from "@/lib/realtime-report";

type Entry = { at: Date; channel: "rate" | "atlas"; summary: string };

export const RealtimeVerifier = ({ className = "" }: { className?: string }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onRate = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setEntries((es) =>
        [
          { at: new Date(), channel: "rate" as const, summary: `1 BTAX = ₦${d?.rate} · ${d?.source}` },
          ...es,
        ].slice(0, 50)
      );
    };
    const onAtlas = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setEntries((es) =>
        [
          { at: new Date(), channel: "atlas" as const, summary: `enriched ${d?.count ?? 0} profile(s)` },
          ...es,
        ].slice(0, 50)
      );
    };
    window.addEventListener("blackpal:rate-refresh", onRate);
    window.addEventListener("blackpal:atlas-refresh", onAtlas);
    return () => {
      window.removeEventListener("blackpal:rate-refresh", onRate);
      window.removeEventListener("blackpal:atlas-refresh", onAtlas);
    };
  }, []);

  return (
    <Card className={`p-3 space-y-2 ${className}`} aria-label="Realtime verification log">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-primary" />
          Realtime Verification Log
        </h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px]"
            onClick={() =>
              downloadRealtimeReport(
                entries.map((e) => ({
                  at: e.at.toISOString(),
                  channel: e.channel,
                  summary: e.summary,
                })),
              )
            }
            aria-label="Download realtime verification report"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px]"
            onClick={() => setEntries([])}
            aria-label="Clear log"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div
        ref={ref}
        className="max-h-44 overflow-y-auto space-y-1 text-[10px] font-mono"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {entries.length === 0 ? (
          <p className="text-muted-foreground">Waiting for live events…</p>
        ) : (
          entries.map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge
                variant="outline"
                className={`text-[8px] ${e.channel === "rate" ? "text-emerald-500" : "text-violet-500"}`}
              >
                {e.channel}
              </Badge>
              <span className="text-muted-foreground">{e.at.toLocaleTimeString()}</span>
              <span className="flex-1">{e.summary}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
