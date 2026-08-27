import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, History, Minus } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

interface LogRow {
  id: string;
  change_kind: string;
  source: string;
  old_score: number | null;
  new_score: number | null;
  old_rank: number | null;
  new_rank: number | null;
  new_status: string | null;
  created_at: string;
}

/**
 * Per-user audit trail of every server-side rescore for this contest.
 * Reads the authoritative `contest_recompute_log` written by the scoring engine.
 */
export function ContestScoreHistory({ contestId, userId }: { contestId: string; userId: string }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("contest_recompute_log")
        .select("id, change_kind, source, old_score, new_score, old_rank, new_rank, new_status, created_at")
        .eq("contest_id", contestId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) {
        setRows((data as LogRow[]) ?? []);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`contest-log-${contestId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contest_recompute_log", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [contestId, userId]);

  if (loading) return null;

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <History className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold">Score history</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No rescores logged yet. The engine scores your run when trades close.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const delta = Number(r.new_score ?? 0) - Number(r.old_score ?? 0);
            const Arrow = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
            const tone =
              delta > 0 ? "text-emerald-500" : delta < 0 ? "text-destructive" : "text-muted-foreground";
            return (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-1 min-w-0">
                  <Arrow className={`w-3 h-3 shrink-0 ${tone}`} />
                  <span className="tabular-nums font-medium">
                    {Number(r.new_score ?? 0).toFixed(1)}
                  </span>
                  <span className={`tabular-nums ${tone}`}>
                    ({delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)})
                  </span>
                  {r.new_rank != null && (
                    <span className="text-muted-foreground truncate">· rank #{r.new_rank}</span>
                  )}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {r.new_status && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                      {r.new_status.replace("_", " ")}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(r.created_at))} ago
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
