import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Zap, TrendingUp, Trophy, Target, Flame, Calendar, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Entry { id: string; amount: number; source: string; created_at: string; metadata: any }

const sourceMeta: Record<string, { label: string; icon: any; tone: string }> = {
  trade_closed:   { label: "Trade closed",   icon: TrendingUp, tone: "text-sky-400" },
  trade_won:      { label: "Win",            icon: Trophy,     tone: "text-emerald-400" },
  win_streak_day: { label: "Win streak",     icon: Flame,      tone: "text-amber-400" },
  phase_passed:   { label: "Phase passed",   icon: Target,     tone: "text-primary" },
  quest:          { label: "Quest reward",   icon: Sparkles,   tone: "text-purple-400" },
  journal:        { label: "Journal",        icon: BookOpen,   tone: "text-cyan-400" },
};

export function XpTimeline({ userId, limit = 25 }: { userId: string; limit?: number }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("xp_ledger")
        .select("id,amount,source,created_at,metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (mounted) {
        setEntries((data || []) as Entry[]);
        setTotal(((data || []) as Entry[]).reduce((s, e) => s + e.amount, 0));
      }
    })();
    const ch = supabase.channel(`xp-tl-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "xp_ledger", filter: `user_id=eq.${userId}` },
        (payload) => {
          setEntries(prev => [payload.new as Entry, ...prev].slice(0, limit));
          setTotal(t => t + (payload.new as Entry).amount);
        })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [userId, limit]);

  // Group by day
  const groups: Record<string, Entry[]> = {};
  for (const e of entries) {
    const day = new Date(e.created_at).toLocaleDateString();
    (groups[day] ||= []).push(e);
  }
  const dayKeys = Object.keys(groups);

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-400" /> XP Timeline</p>
        <span className="text-[10px] text-muted-foreground font-mono">+{total} XP · last {entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-3">No XP gains yet. Take a trade, finish a quest, or pass a phase to start earning.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {dayKeys.map(day => {
            const dayTotal = groups[day].reduce((s, e) => s + e.amount, 0);
            return (
              <div key={day}>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground sticky top-0 bg-card pb-1">
                  <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {day}</span>
                  <span className="font-mono">+{dayTotal} XP</span>
                </div>
                <div className="space-y-1">
                  {groups[day].map(e => {
                    const m = sourceMeta[e.source] || { label: e.source.replace(/_/g, " "), icon: Sparkles, tone: "text-muted-foreground" };
                    const Icon = m.icon;
                    return (
                      <div key={e.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 border border-border/40">
                        <Icon className={cn("w-3 h-3 shrink-0", m.tone)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium capitalize truncate">{m.label}</p>
                          <p className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0">+{e.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
