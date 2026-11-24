import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDailyStreakUpdate } from "@/lib/daily-streak";

interface StreakTrackerProps {
  userId: string;
  onStreakUpdate?: (streakDays: number) => void;
  initialProfile?: {
    achievement_streak?: number | null;
    best_achievement_streak?: number | null;
    streak_days?: number | null;
    last_login_at?: string | null;
    win_streak?: number | null;
    best_win_streak?: number | null;
  } | null;
}

export const StreakTracker = ({ userId, onStreakUpdate, initialProfile }: StreakTrackerProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  // Win streak: consecutive contest passes (profiles.win_streak).
  // Distinct from the daily-login streak: logging in never moves this,
  // and contest results never move the login streak.
  const [winStreak, setWinStreak] = useState(0);
  const [bestWinStreak, setBestWinStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  // Stable callback ref — prevents re-running streak logic every parent render
  const onUpdateRef = useRef(onStreakUpdate);
  onUpdateRef.current = onStreakUpdate;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const run = async () => {
      try {
        // Dashboard already loaded these columns in its profile query; the
        // streak write still goes through the atomic path below.
        const profileData = initialProfile
          ? initialProfile
          : await supabase
              .from("profiles")
              .select("achievement_streak, best_achievement_streak, streak_days, last_login_at, win_streak, best_win_streak")
              .eq("id", userId)
              .single()
              .then(({ data, error }) => {
                if (error) throw error;
                return data;
              });

        if (cancelled) return;

        // Keep legacy/migration-dependent columns typed locally until the
        // generated database schema catches up with the deployed profile.
        const profile = profileData as unknown as {
          achievement_streak?: number | null;
          best_achievement_streak?: number | null;
          streak_days?: number | null;
          last_login_at?: string | null;
          win_streak?: number | null;
          best_win_streak?: number | null;
        } | null;

        const previousStreak = profile?.achievement_streak ?? profile?.streak_days ?? 0;
        const previousBest = profile?.best_achievement_streak ?? 0;
        const lastLoginAt = profile?.last_login_at ?? null;

        // Show saved values immediately so UI does not flicker to 0
        setCurrentStreak(previousStreak);
        setBestStreak(previousBest);
        // Pre-migration the columns do not exist and come back undefined.
        setWinStreak(profile?.win_streak ?? 0);
        setBestWinStreak(profile?.best_win_streak ?? 0);
        setLoading(false);

        const now = new Date();
        const next = calculateDailyStreakUpdate(lastLoginAt, previousStreak, previousBest, now);
        let { currentStreak: nextStreak, bestStreak: nextBest } = next;
        let streakWasUpdated = false;

        if (next.shouldWrite) {
          // Prefer the atomic server RPC so achievement_streak and
          // streak_days are written from one value. If the migration
          // has not been applied yet, fall back to the direct update.
          // The direct update writes last_login_at together with the
          // streak, so a concurrent mount then sees gap 0 and does not
          // double-count.
          const { error: rpcError } = await (supabase as any).rpc(
            "sync_login_streak",
            {
              p_last_login_at: now.toISOString(),
              p_current_streak: nextStreak,
              p_best_streak: nextBest,
            },
          );
          if (rpcError) {
            const { error: fallbackError } = await supabase
              .from("profiles")
              .update({
                last_login_at: now.toISOString(),
                achievement_streak: nextStreak,
                streak_days: nextStreak,
                best_achievement_streak: nextBest,
              })
              .eq("id", userId);
            if (fallbackError) throw fallbackError;
          }
          streakWasUpdated = true;
        }

        if (cancelled) return;

        setCurrentStreak(nextStreak);
        setBestStreak(nextBest);
        onUpdateRef.current?.(nextStreak);

        const milestones = [7, 30, 100, 365];
        if (streakWasUpdated && milestones.includes(nextStreak)) {
          try {
            await supabase.functions.invoke("award-achievement", {
              body: {
                event_type: "streak_milestone",
                event_data: { streak_days: nextStreak },
              },
            });
          } catch (awardErr) {
            console.error("Failed to award streak milestone:", awardErr);
          }
        }
      } catch (error) {
        console.error("Error processing daily login streak:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // Only re-run when userId changes — NOT when parent passes a new callback
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-8 bg-muted rounded w-16"></div>
        </div>
      </Card>
    );
  }

  const getStreakLevel = (streak: number) => {
    if (streak >= 365) return { label: "Legendary", color: "from-amber-400 to-yellow-600" };
    if (streak >= 100) return { label: "Master", color: "from-purple-400 to-fuchsia-600" };
    if (streak >= 30) return { label: "Dedicated", color: "from-blue-400 to-cyan-600" };
    if (streak >= 7) return { label: "Consistent", color: "from-emerald-400 to-green-600" };
    return { label: "Building", color: "from-slate-400 to-slate-600" };
  };

  const streakLevel = getStreakLevel(currentStreak);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Daily Login
          </span>
        </div>
        <Badge className={`bg-gradient-to-r ${streakLevel.color} text-white border-0 text-[10px] font-bold`}>
          {streakLevel.label}
        </Badge>
      </div>

      <div className="flex items-end gap-4">
        <div>
          <div className="text-2xl font-extrabold tabular-nums leading-none">{currentStreak}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
            Day streak
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Award className="w-3 h-3" />
            Best: <span className="text-foreground tabular-nums">{bestStreak}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            Keep logging in daily<br />
            {/* Win streak: the largest XP source. Displayed honestly; the
                columns appear once the progression migration is applied. */}
            Win streak: <span className="text-foreground tabular-nums">{winStreak}</span>
            {bestWinStreak > 0 ? (
              <span className="text-muted-foreground"> (best {bestWinStreak})</span>
            ) : null}
            <span className="block text-[10px] font-normal">
              Pass contests back to back: 100 XP per pass, win-streak milestones pay 150 to 1000 XP
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StreakTracker;
