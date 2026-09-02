import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Trophy } from "lucide-react";
import { LeaderboardSkeleton } from "./ContestSkeletons";

interface Row {
  user_id: string;
  score: number;
  rank: number | null;
  status: string;
  profit_pct: number;
  drawdown_pct: number;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function ContestLeaderboard({
  contestId,
  meId,
}: {
  contestId: string;
  meId: string | null;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("contest_entries")
      .select("user_id,score,rank,status,profit_pct,drawdown_pct")
      .eq("contest_id", contestId)
      .order("score", { ascending: false })
      .limit(25);

    const entries = (data ?? []) as Row[];
    if (entries.length) {
      const ids: string[] = entries.map((e) => e.user_id);
      const { data: profs } = await (supabase.from("profiles") as any)
        .select("user_id,display_name,avatar_url")
        .in("user_id", ids);
      const map = new Map<string, any>(((profs ?? []) as any[]).map((p) => [p.user_id as string, p]));
      entries.forEach((e) => {
        const p = map.get(e.user_id);
        e.display_name = p?.display_name ?? "Anonymous trader";
        e.avatar_url = p?.avatar_url ?? null;
      });
    }
    setRows(entries);
    setLoading(false);
  }, [contestId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`contest-lb-${contestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contest_entries", filter: `contest_id=eq.${contestId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [contestId, load]);

  if (loading) return <LeaderboardSkeleton />;

  if (!rows.length) {
    return (
      <Card className="p-4 text-center">
        <Trophy className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
        <p className="text-[11px] text-muted-foreground">
          No record holders yet. First name on this board owns the bragging rights.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => {
        const isMe = meId === r.user_id;
        return (
          <div
            key={r.user_id}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-transform duration-200 hover:translate-x-0.5 ${
              isMe ? "border-primary/50 bg-primary/10 neon-border" : "border-border/60 bg-card"
            }`}
          >
            <span className="w-5 text-center text-[11px] font-bold tabular-nums text-muted-foreground">
              {i === 0 ? <Crown className="w-3.5 h-3.5 mx-auto text-primary" /> : i + 1}
            </span>
            <Avatar className="w-6 h-6">
              <AvatarImage src={r.avatar_url ?? undefined} alt={r.display_name ?? "trader"} />
              <AvatarFallback className="text-[9px]">
                {(r.display_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[11px] font-semibold ${i < 3 ? "neon-text" : ""}`}>
                {r.display_name}
                {isMe && <span className="ml-1 text-[9px] text-primary">you</span>}
              </p>
              <p className="text-[9px] text-muted-foreground tabular-nums">
                {Number(r.profit_pct).toFixed(2)}% profit · {Number(r.drawdown_pct).toFixed(2)}% DD
              </p>
            </div>
            <Badge
              variant={r.status === "passed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}
              className="text-[9px] px-1.5 py-0"
            >
              {r.status === "in_progress" ? "running" : r.status}
            </Badge>
            <span className="w-10 text-right text-[11px] font-bold tabular-nums text-primary neon-text-accent">
              {Number(r.score).toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
