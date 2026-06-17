import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, Gift, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Quest {
  id: string; quest_key: string; title: string; description: string | null;
  period: "daily" | "weekly"; target: number; xp_reward: number; btax_reward: number;
  icon: string | null; sort_order: number;
}
interface Progress {
  id: string; quest_id: string; progress: number;
  completed_at: string | null; claimed_at: string | null; period_start: string;
}

export function QuestsPanel({ userId }: { userId: string }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    await (supabase as any).rpc("refresh_quest_progress");
    const [qRes, pRes] = await Promise.all([
      (supabase as any).from("xp_quests").select("*").eq("is_active", true).order("sort_order"),
      (supabase as any).from("xp_quest_progress").select("*").eq("user_id", userId),
    ]);
    setQuests((qRes.data || []) as Quest[]);
    const map: Record<string, Progress> = {};
    for (const p of (pRes.data || []) as Progress[]) map[p.quest_id] = p;
    setProgress(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`quests-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "xp_quest_progress", filter: `user_id=eq.${userId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const claim = async (progId: string) => {
    setClaiming(progId);
    const { error } = await (supabase as any).rpc("claim_quest", { p_progress_id: progId });
    setClaiming(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Quest reward claimed");
    load();
  };

  if (loading) {
    return <Card className="p-3"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading quests…</div></Card>;
  }

  const daily = quests.filter(q => q.period === "daily");
  const weekly = quests.filter(q => q.period === "weekly");

  const renderQuest = (q: Quest) => {
    const p = progress[q.id];
    const pct = Math.min(100, ((p?.progress ?? 0) / q.target) * 100);
    const complete = p && p.progress >= q.target;
    const claimed = !!p?.claimed_at;
    return (
      <div key={q.id} className={cn(
        "p-2 rounded-lg border bg-card/40 transition-colors",
        claimed ? "border-emerald-500/30 opacity-60" :
        complete ? "border-primary/40 shadow-[0_0_18px_-6px_hsl(var(--primary)/0.5)]" : "border-border",
      )}>
        <div className="flex items-start gap-2">
          <div className="text-base shrink-0">{q.icon || "🎯"}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold truncate">{q.title}</p>
              <span className="flex items-center gap-1 text-[9px] font-mono shrink-0">
                <Zap className="w-2.5 h-2.5 text-amber-400" />{q.xp_reward}
                {q.btax_reward > 0 && <><Gift className="w-2.5 h-2.5 text-primary ml-1" />{q.btax_reward}</>}
              </span>
            </div>
            {q.description && <p className="text-[9px] text-muted-foreground truncate">{q.description}</p>}
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-700",
                claimed ? "bg-emerald-500" : complete ? "bg-primary" : "bg-amber-400")}
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-muted-foreground font-mono">{p?.progress ?? 0} / {q.target}</span>
              {claimed ? (
                <span className="flex items-center gap-1 text-[9px] text-emerald-500"><CheckCircle2 className="w-2.5 h-2.5" /> Claimed</span>
              ) : complete ? (
                <Button size="sm" className="h-5 text-[9px] px-2" disabled={claiming === p?.id} onClick={() => p && claim(p.id)}>
                  {claiming === p?.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Claim"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold flex items-center gap-1.5"><Trophy className="w-3 h-3 text-amber-400" /> XP Quests</p>
      </div>
      {daily.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Today</p>
          <div className="space-y-1.5">{daily.map(renderQuest)}</div>
        </div>
      )}
      {weekly.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 mt-2">This week</p>
          <div className="space-y-1.5">{weekly.map(renderQuest)}</div>
        </div>
      )}
    </Card>
  );
}
