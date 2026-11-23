import { useCallback, useEffect, useState } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Trophy, Loader2, Info, Swords, KeyRound, ChevronDown, Eye, Lock } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { lazy, Suspense } from "react";
const ContestLeaderboard = lazy(() => import("@/components/contest/ContestLeaderboard").then((m) => ({ default: m.ContestLeaderboard })));
const ContestProgressPanel = lazy(() => import("@/components/contest/ContestProgressPanel").then((m) => ({ default: m.ContestProgressPanel })));
const RecomputeStatusIndicator = lazy(() => import("@/components/contest/RecomputeStatusIndicator").then((m) => ({ default: m.RecomputeStatusIndicator })));
const ContestScoreHistory = lazy(() => import("@/components/contest/ContestScoreHistory").then((m) => ({ default: m.ContestScoreHistory })));
const LeaderboardSkeleton = ({ rows = 5 }: { rows?: number }) => null;
const ScoreHistorySkeleton = ({ rows = 5 }: { rows?: number }) => null;
import { ContestRulesModal } from "@/components/contest/ContestRulesModal";
import { ContestCountdown } from "@/components/contest/ContestCountdown";
import { ContestReminderPrefs } from "@/components/contest/ContestReminderPrefs";
import { ContestCardSkeleton } from "@/components/contest/ContestSkeletons";
import { AccountAccessDialog } from "@/components/portfolio/AccountAccessDialog";
import { AscendAmbient } from "@/components/ascend/AscendAmbient";
import { CountUp } from "@/components/ascend/CountUp";

import { ContestRules, ContestStats } from "@/lib/contest-scoring";
import {
  capacityInfo,
  formatCapacity,
  isCapacityError,
} from "@/lib/contest-capacity";

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
  /** null = unlimited. Missing column (migration not applied) also = unlimited. */
  max_entries?: number | null;
}

interface Entry extends ContestStats {
  contest_id: string;
  score: number;
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

const ContestLeaderboard_Entry = () => null;

const mysteryDetails = (c: Contest) =>
  c.rules ? (
    <details className="text-[10px]">
      <summary className="cursor-pointer text-primary">House rules</summary>
      <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{c.rules}</p>
    </details>
  ) : null;

const DeferredContestPanels = ({ contestId, contest, meId, entry, ended }: { contestId: string; contest: Contest; meId: string | null; entry?: Entry; ended: boolean }) => {
  return (
    <Suspense fallback={null}>
      <>
        <ContestLeaderboard contestId={contestId} meId={meId} />
        <div className="mt-2" />
        {entry && meId ? (
          <>
            <ContestProgressPanel
              rules={toRules(contest)}
              stats={{
                profit_pct: Number(entry.profit_pct),
                drawdown_pct: Number(entry.drawdown_pct),
                trades_count: Number(entry.trades_count),
                active_days: Number(entry.active_days),
              }}
              ended={ended}
              rank={entry.rank}
              serverStatus={entry.status}
            />
            <ContestScoreHistory contestId={contestId} userId={meId} />
          </>
        ) : null}
        <div className="mt-2 text-[9px] text-muted-foreground flex items-center gap-1">
          <RecomputeStatusIndicator contestId={contestId} />
        </div>
      </>
    </Suspense>
  );
};

export default function Contest() {
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState<Contest[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [rulesFor, setRulesFor] = useState<Contest | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [prizePool, setPrizePool] = useState(0);
  const [accountFor, setAccountFor] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  // Live entrant counts per contest, used for the spots display and full check.
  const [entrantCounts, setEntrantCounts] = useState<Record<string, number>>({});

  const loadEntries = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("contest_entries")
      .select("contest_id,score,profit_pct,drawdown_pct,trades_count,active_days,rank,status")
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
      setPrizePool(list.reduce((s, c) => s + Number(c.prize_btax || 0), 0));

      if (list.length) {
        const { data: entryRows } = await supabase
          .from("contest_entries")
          .select("contest_id")
          .in(
            "contest_id",
            list.map((c) => c.id),
          );
        const counts: Record<string, number> = {};
        ((entryRows ?? []) as { contest_id: string }[]).forEach((r) => {
          counts[r.contest_id] = (counts[r.contest_id] ?? 0) + 1;
        });
        setEntrantCounts(counts);
      } else {
        setEntrantCounts({});
      }

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

  // Keep entrant counts live so spots fill up / free up in real time.
  useEffect(() => {
    if (!contests.length) return;
    const ids = new Set(contests.map((c) => c.id));
    const ch = supabase
      .channel("contest-entrant-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contest_entries" },
        (payload: { new?: { contest_id?: string }; old?: { contest_id?: string }; eventType?: string }) => {
          const cid = payload.new?.contest_id ?? payload.old?.contest_id;
          if (!cid || !ids.has(cid)) return;
          const delta = payload.eventType === "DELETE" ? -1 : payload.eventType === "INSERT" ? 1 : 0;
          if (delta !== 0) {
            setEntrantCounts((prev) => ({
              ...prev,
              [cid]: Math.max(0, (prev[cid] ?? 0) + delta),
            }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [contests]);

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
    const cap = capacityInfo(entrantCounts[c.id] ?? 0, c.max_entries ?? null);
    if (cap.isFull) {
      toast.error(
        cap.status === "over_capacity"
          ? "This contest is over capacity right now"
          : "This contest is full",
        { description: "No new entries are being accepted at the moment." },
      );
      return;
    }
    setJoining(c.id);
    const { error } = await supabase
      .from("contest_entries")
      .insert({ contest_id: c.id, user_id: userId });
    setJoining(null);
    if (error) {
      if (isCapacityError(error)) {
        toast.error("This contest is full", {
          description: "It just filled up — no new entries are being accepted.",
        });
        setEntrantCounts((prev) => ({
          ...prev,
          [c.id]: Math.max(prev[c.id] ?? 0, cap.max ?? (prev[c.id] ?? 0)),
        }));
      } else {
        toast.error("Could not enter this contest");
      }
      return;
    }
    // Participation XP: 20 XP, once per contest per user. The AFTER INSERT
    // trigger (progression migration) pays it server-side via award_xp_once
    // keyed to the contest_entries row, and the RPC below is the backstop
    // for retries: both hit the same xp_ledger unique index, so joining
    // twice can never pay twice. Fire-and-forget: a missing RPC (migration
    // not applied yet) must not break the join.
    void (async () => {
      try {
        const { data: xp, error: xpErr } = await (supabase as any).rpc(
          "award_contest_participation",
          { p_contest_id: c.id },
        );
        if (!xpErr && xp?.xp > 0) {
          toast.success(`+${xp.xp} XP`, {
            description: "Contest participation XP",
          });
        }
      } catch {
        /* participation XP unavailable; join already succeeded */
      }
    })();

    toast.success(`You're in — ${c.title}`, { description: "Your run is being tracked from now." });
    setEntrantCounts((prev) => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + 1 }));
    setOpened((o) => ({ ...o, [c.id]: true }));
    loadEntries(userId);
  };

  return (
    <div className="min-h-screen bg-background rebrand-contest relative">
      <AscendAmbient />
      <FloatingNav />
      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-20">
        <header className="mb-4 ascend-reveal">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 orbit-3d" /> <span className="neon-text">Contests</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live contests posted by the academy. Win BTAX rewards.
          </p>
        </header>

        <section className="mb-4 ascend-panel rounded-2xl p-4 ascend-reveal">
          {/* Lottie slot — replace this div with your Lottie player when ready */}
          <div
            id="contest-hero-lottie"
            className="mb-3 w-full h-36 sm:h-44 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden"
            aria-label="Contest hero animation"
          >
            <p className="text-[11px] text-muted-foreground px-4 text-center">
              Drop your Lottie animation here
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize pool</p>
              <CountUp value={prizePool} className="text-sm sm:text-lg font-bold neon-text-accent" suffix=" BTAX" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live contests</p>
              <CountUp value={contests.length} className="text-sm sm:text-lg font-bold neon-text" />
            </div>
          </div>
          <p className="text-sm sm:text-base font-bold leading-snug">
            78% of traders could not pass this. Prove them wrong and be on the record holder leaderboard.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Everyone says they have an edge. The drawdown rule says otherwise. Entry is free. Pick your gauntlet and
            let the leaderboard settle it.
          </p>
        </section>

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
              const isOpen = !!opened[c.id];
              const cap = capacityInfo(entrantCounts[c.id] ?? 0, c.max_entries ?? null);
              const full = cap.isFull;
              return (
                <Card key={c.id} className="p-4 space-y-3 tilt-3d neon-border">
                  {c.cover_url && (
                    <img src={c.cover_url} alt={c.title} className="w-full h-28 object-cover rounded-lg" />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate neon-text">{c.title}</h3>
                      {c.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Free entry
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                    <span className="text-primary font-semibold neon-text-accent">
                      Prize: {Number(c.prize_btax).toLocaleString()} BTAX
                    </span>
                    <span className="text-muted-foreground">
                      Target {c.target_profit_pct}% · Max DD {c.max_drawdown_pct}%
                    </span>
                    <span
                      className={
                        full
                          ? "font-semibold text-destructive"
                          : "text-muted-foreground"
                      }
                      aria-label={
                        cap.max !== null
                          ? `${cap.entrants} of ${cap.max} spots filled`
                          : `${cap.entrants} entered, unlimited spots`
                      }
                    >
                      {formatCapacity(cap.entrants, cap.max)}
                      {cap.max !== null && cap.status === "open" && (
                        <> · {cap.spotsRemaining} {cap.spotsRemaining === 1 ? "spot" : "spots"} left</>
                      )}
                      {cap.status === "full" && " · Full"}
                      {cap.status === "over_capacity" && " · Over capacity"}
                    </span>
                    <ContestCountdown endsAt={c.ends_at} />
                    <span className="text-muted-foreground">
                      Official status: {entry ? entry.status.replace(/_/g, " ") : "not entered"}
                    </span>
                  </div>

                  {full && !entry && (
                    <p className="text-[11px] font-semibold text-destructive" role="status">
                      {cap.status === "over_capacity"
                        ? "This contest is over capacity — no new entries are being accepted."
                        : "This contest is full — no new entries are being accepted."}
                    </p>
                  )}
                  {full && entry && (
                    <p className="text-[11px] text-muted-foreground">
                      You&apos;re in — this contest is {cap.status === "over_capacity" ? "over capacity" : "full"} for
                      new entries, but your spot is safe.
                    </p>
                  )}

                  {!entry && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-10 flex-1 text-sm font-bold"
                        disabled={ended || full || joining === c.id}
                        onClick={() => join(c)}
                      >
                        {joining === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Swords className="w-4 h-4 mr-1.5" />
                            {ended
                              ? "Contest closed"
                              : full
                                ? cap.status === "over_capacity"
                                  ? "Over capacity"
                                  : "Contest full"
                                : "Enter gauntlet — Free"}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 text-xs"
                        onClick={() => setRulesFor(c)}
                      >
                        <Info className="w-3.5 h-3.5 mr-1" /> Rules
                      </Button>
                    </div>
                  )}
                  {entry && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 flex-1 text-[11px]"
                        disabled
                      >
                        <Swords className="w-3.5 h-3.5 mr-1" /> Entered
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
                  )}

                  {entry && userId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-full text-[11px]"
                      onClick={() => setAccountFor(c.id)}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" /> My account & login details
                    </Button>
                  )}

                  <Collapsible
                    open={isOpen}
                    onOpenChange={(v) => setOpened((o) => ({ ...o, [c.id]: v }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-full text-[11px] text-muted-foreground">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        {isOpen ? "Hide leaderboard & your run" : "View leaderboard & your run"}
                        <ChevronDown
                          className={`w-3.5 h-3.5 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      {!entry && !ended && (
                        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground py-3">
                          <Lock className="w-3.5 h-3.5" />
                          Enter the gauntlet to unlock your run progress. Use the Enter button above to join.
                        </div>
                      )}
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
                          <DeferredContestPanels contestId={c.id} contest={c} meId={userId} entry={entry} ended={ended} />
                        </TabsContent>
                        <TabsContent value="progress" className="mt-2 space-y-2">
                          {entry && userId ? (
                            <DeferredContestPanels contestId={c.id} contest={c} meId={userId} entry={entry} ended={ended} />
                          ) : (
                            <Card className="p-4 text-center">
                              <p className="text-[11px] text-muted-foreground">
                                You haven&apos;t entered yet. {c.fail_rate_pct}% failed this one — the board is still
                                short a record holder.
                              </p>
                            </Card>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CollapsibleContent>
                  </Collapsible>

                  {mysteryDetails(c)}
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

      <AccountAccessDialog
        open={!!accountFor}
        onOpenChange={(v) => !v && setAccountFor(null)}
        contestId={accountFor ?? undefined}
        userId={userId ?? undefined}
      />
    </div>
  );
}
