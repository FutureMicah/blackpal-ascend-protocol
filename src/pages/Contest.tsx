import { useCallback, useEffect, useState } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Trophy, Loader2, Info, Swords, Timer } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { ContestRulesModal } from "@/components/contest/ContestRulesModal";
import { ContestLeaderboard } from "@/components/contest/ContestLeaderboard";
import { ContestProgressPanel } from "@/components/contest/ContestProgressPanel";
import { ContestReminderPrefs } from "@/components/contest/ContestReminderPrefs";
import { RecomputeStatusIndicator } from "@/components/contest/RecomputeStatusIndicator";
import { ContestScoreHistory } from "@/components/contest/ContestScoreHistory";


import { ContestRules, ContestStats } from "@/lib/contest-scoring";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_btax: number;
  starts_at: string | null;
  ends_at: string | null;
  rules: string | null;
  cover_url: string | null;
  entry_price_usd: number;
  target_profit_pct: number;
  max_drawdown_pct: number;
  min_trades: number;
  min_active_days: number;
  fail_rate_pct: number;
}

interface Entry extends ContestStats {
  contest_id: string;
  rank: number | null;
  status: string;
}

const toRules = (c: Contest): ContestRules => ({
  entry_price_usd: Number(c.entry_price_usd),
  target_profit_pct: Number(c.target_profit_pct),
  max_drawdown_pct: Number(c.max_drawdown_pct),
  min_trades: Number(c.min_trades),
  min_active_days: Number(c.min_active_days),
  fail_rate_pct: Number(c.fail_rate_pct),
});

export default function Contest() {
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<Contest[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [rulesFor, setRulesFor] = useState<Contest | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const loadEntries = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("contest_entries")
      .select("contest_id,profit_pct,drawdown_pct,trades_count,active_days,rank,status")
      .eq("user_id", uid);
    const map: Record<string, Entry> = {};
    ((data ?? []) as Entry[]).forEach((e) => {
      map[e.contest_id] = e;
    });
    setEntries(map);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);

      const { data } = await supabase
        .from("contests")
        .select("*")
        .eq("is_active", true)
        .order("entry_price_usd", { ascending: true });
      const list = (data as Contest[]) || [];
      setContests(list);
      if (uid) await loadEntries(uid);
      setLoading(false);
    })();
  }, [loadEntries]);

  // Live score updates for my own entries
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`my-contest-entries-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contest_entries", filter: `user_id=eq.${userId}` },
        () => loadEntries(userId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, loadEntries]);

  // "Ending soon" warning based on the user's reminder window
  useEffect(() => {
    if (!userId || !contests.length) return;
    let cancelled = false;
    (async () => {
      const { data: prefs } = await supabase
        .from("contest_reminder_prefs")
        .select("in_app_enabled,ending_soon_minutes")
        .eq("user_id", userId)
        .maybeSingle();
      const enabled = prefs?.in_app_enabled ?? true;
      const window = Number(prefs?.ending_soon_minutes ?? 60);
      if (!enabled || cancelled) return;
      contests.forEach((c) => {
        if (!c.ends_at || !entries[c.id]) return;
        const msLeft = new Date(c.ends_at).getTime() - Date.now();
        if (msLeft > 0 && msLeft <= window * 60_000) {
          toast.warning(`${c.title} ends in ${formatDistanceToNowStrict(new Date(c.ends_at))}`, {
            description: "Close what needs closing — the leaderboard locks at the bell.",
          });
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, contests, entries]);

  const join = async (c: Contest) => {
    if (!userId) {
      toast.error("Sign in to enter the gauntlet");
      return;
    }
    setJoining(c.id);
    const { error } = await supabase
      .from("contest_entries")
      .insert({ contest_id: c.id, user_id: userId });
    setJoining(null);
    if (error) {
      toast.error("Could not enter this contest");
      return;
    }
    toast.success(`You're in — ${c.title}`, { description: "Your run is being tracked from now." });
    loadEntries(userId);
  };

  return (
    <div className="min-h-screen bg-background rebrand-contest">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <header className="mb-4">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Contests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live contests posted by the academy. Win BTAX rewards.
          </p>
        </header>

        <Card className="mb-4 p-4 border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card">
          <p className="text-sm sm:text-base font-bold leading-snug">
            78% of traders could not pass this. Prove them wrong and be on the record holder leaderboard.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Everyone says they have an edge. The drawdown rule says otherwise. Pick your entry — $10, $50 or $100 — and
            let the leaderboard settle it.
          </p>
        </Card>

        {userId && (
          <div className="mb-4">
            <ContestReminderPrefs userId={userId} />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <ContestCardSkeleton key={i} />
            ))}
          </div>
        ) : contests.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h2 className="text-sm font-bold">No active contests yet</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Check back soon — the academy will post the next contest here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {contests.map((c) => {
              const entry = entries[c.id];
              const ended = !!c.ends_at && new Date(c.ends_at).getTime() < Date.now();
              return (
                <Card key={c.id} className="p-4 space-y-3">
                  {c.cover_url && (
                    <img src={c.cover_url} alt={c.title} className="w-full h-28 object-cover rounded-lg" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate">{c.title}</h3>
                      {c.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      ${Number(c.entry_price_usd)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                    <span className="text-primary font-semibold">
                      Prize: {Number(c.prize_btax).toLocaleString()} BTAX
                    </span>
                    <span className="text-muted-foreground">
                      Target {c.target_profit_pct}% · Max DD {c.max_drawdown_pct}%
                    </span>
                    {c.ends_at && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {ended ? "Ended" : `Ends ${format(new Date(c.ends_at), "MMM d")}`}
                      </span>
                    )}
                    <RecomputeStatusIndicator contestId={c.id} />
                  </div>


                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 flex-1 text-[11px]"
                      disabled={!!entry || ended || joining === c.id}
                      onClick={() => join(c)}
                    >
                      {joining === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Swords className="w-3.5 h-3.5 mr-1" />
                          {entry ? "Entered" : ended ? "Closed" : "Enter gauntlet"}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      onClick={() => setRulesFor(c)}
                    >
                      <Info className="w-3.5 h-3.5 mr-1" /> Rules
                    </Button>
                  </div>

                  <Tabs defaultValue="leaderboard">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="leaderboard" className="text-[11px]">
                        Record holders
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="text-[11px]">
                        Your run
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="leaderboard" className="mt-2">
                      <ContestLeaderboard contestId={c.id} meId={userId} />
                    </TabsContent>
                    <TabsContent value="progress" className="mt-2 space-y-2">
                      {entry && userId ? (
                        <>
                          <ContestProgressPanel
                            rules={toRules(c)}
                            stats={{
                              profit_pct: Number(entry.profit_pct),
                              drawdown_pct: Number(entry.drawdown_pct),
                              trades_count: Number(entry.trades_count),
                              active_days: Number(entry.active_days),
                            }}
                            ended={ended}
                            rank={entry.rank}
                          />
                          <ContestScoreHistory contestId={c.id} userId={userId} />
                        </>
                      ) : (
                        <Card className="p-4 text-center">
                          <p className="text-[11px] text-muted-foreground">
                            You haven't entered yet. {c.fail_rate_pct}% failed this one — the board is still short a
                            record holder.
                          </p>
                        </Card>
                      )}
                    </TabsContent>

                  </Tabs>

                  {c.rules && (
                    <details className="text-[10px]">
                      <summary className="cursor-pointer text-primary">House rules</summary>
                      <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{c.rules}</p>
                    </details>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {rulesFor && (
        <ContestRulesModal
          open={!!rulesFor}
          onOpenChange={(v) => !v && setRulesFor(null)}
          title={rulesFor.title}
          rules={toRules(rulesFor)}
        />
      )}
    </div>
  );
}
