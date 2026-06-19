import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Gift, Loader2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Row {
  id: string;
  claimed_at: string | null;
  completed_at: string | null;
  progress: number;
  quest: { title: string; icon: string | null; xp_reward: number; btax_reward: number; period: string } | null;
}

export function QuestClaimHistory({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("xp_quest_progress")
      .select("id, claimed_at, completed_at, progress, quest:xp_quests(title,icon,xp_reward,btax_reward,period)")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .order("claimed_at", { ascending: false, nullsFirst: false })
      .limit(50);
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`quest-history-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "xp_quest_progress", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [userId]);

  const claimed = rows.filter(r => r.claimed_at);
  const totalXp = claimed.reduce((s, r) => s + (r.quest?.xp_reward || 0), 0);
  const totalBtax = claimed.reduce((s, r) => s + (r.quest?.btax_reward || 0), 0);
  const visible = showAll ? rows : rows.slice(0, 6);

  if (loading) {
    return <Card className="p-3"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading history…</div></Card>;
  }

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold flex items-center gap-1.5"><Trophy className="w-3 h-3 text-amber-400" /> Quest history</p>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 text-amber-400" />{totalXp}</span>
          <span className="flex items-center gap-0.5"><Gift className="w-2.5 h-2.5 text-primary" />{totalBtax}</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-3">No completed quests yet.</p>
      ) : (
        <div className="space-y-1">
          {visible.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-1.5 rounded-md bg-card/40 border border-border">
              <span className="text-sm">{r.quest?.icon || "🎯"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold truncate">{r.quest?.title || "Quest"}</p>
                  <Badge variant="outline" className="text-[8px] capitalize px-1 py-0 h-3.5">{r.quest?.period}</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {r.claimed_at
                    ? `Claimed ${formatDistanceToNow(new Date(r.claimed_at), { addSuffix: true })}`
                    : `Completed ${r.completed_at ? formatDistanceToNow(new Date(r.completed_at), { addSuffix: true }) : ""} · unclaimed`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-[9px] font-mono">
                  <Zap className="w-2.5 h-2.5 text-amber-400" />{r.quest?.xp_reward || 0}
                  {(r.quest?.btax_reward || 0) > 0 && <><Gift className="w-2.5 h-2.5 text-primary ml-0.5" />{r.quest?.btax_reward}</>}
                </div>
                {r.claimed_at && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto mt-0.5" />}
              </div>
            </div>
          ))}
          {rows.length > 6 && (
            <button onClick={() => setShowAll(v => !v)} className="w-full text-[9px] text-primary hover:underline pt-1">
              {showAll ? "Show less" : `Show all ${rows.length}`}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
