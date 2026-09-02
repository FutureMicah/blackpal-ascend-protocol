import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

interface RunRow {
  id: string;
  status: string;
  source: string;
  entries_total: number;
  entries_changed: number;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}

const relative = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

/**
 * Live scoring status for a contest. Streams `contest_recompute_runs` over
 * realtime so the badge flips to "Recomputing" and back without a refresh.
 */
export function RecomputeStatusIndicator({ contestId }: { contestId: string }) {
  const [run, setRun] = useState<RunRow | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("contest_recompute_runs")
        .select("id, status, source, entries_total, entries_changed, started_at, finished_at, duration_ms")
        .eq("contest_id", contestId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setRun((data as RunRow) ?? null);
    };
    load();

    const channel = supabase
      .channel(`contest-recompute-${contestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contest_recompute_runs",
          filter: `contest_id=eq.${contestId}`,
        },
        (payload) => {
          const next = payload.new as RunRow | null;
          if (next?.id) setRun(next);
        },
      )
      .subscribe();

    // keep the "x ago" label fresh
    const t = setInterval(() => setTick((n) => n + 1), 15000);

    return () => {
      cancelled = true;
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [contestId]);

  const running = run?.status === "running";

  const label = !run
    ? "Not scored yet"
    : running
      ? "Recomputing scores…"
      : `Scored ${relative(run.finished_at ?? run.started_at)}`;

  const abs = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

  const detail = !run ? (
    "This gauntlet has not been scored by the engine yet."
  ) : (
    <span className="block space-y-0.5">
      <span className="block">
        {running
          ? `Scoring run in progress (${run.source}).`
          : `${run.entries_changed} of ${run.entries_total} entries changed · ${run.source} run · ${
              run.duration_ms ?? 0
            }ms`}
      </span>
      <span className="block text-muted-foreground">Started: {abs(run.started_at)}</span>
      <span className="block text-muted-foreground">
        Finished: {running ? "running…" : abs(run.finished_at)}
      </span>
      <span className="block text-muted-foreground break-all">Run id: {run.id}</span>
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Badge
              variant={running ? "default" : "secondary"}
              aria-live="polite"
              className="text-[9px] px-1.5 py-0 gap-1 font-medium"
            >
              {running ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : run ? (
                <CheckCircle2 className="w-2.5 h-2.5" />
              ) : (
                <Clock className="w-2.5 h-2.5" />
              )}
              {label}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-[10px]">
          {detail}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
