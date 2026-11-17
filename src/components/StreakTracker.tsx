import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDailyStreakUpdate } from "@/lib/daily-streak";

interface StreakTrackerProps {
  userId: string;
  onStreakUpdate?: (streakDays: number) => void;
}

export const StreakTracker = ({ userId, onStreakUpdate }: StreakTrackerProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const run = async () => {
      try {
        // 1. Load current profile state first (no race)
        const { data: profile, error: loadError } = await supabase
          .from("profiles")
          .select(
            "achievement_streak, best_achievement_streak, streak_days, last_login_at"
          )
          .eq("id", userId)
          .single();

        if (loadError) throw loadError;
        if (cancelled) return;

        const previousStreak =
          profile?.achievement_streak ?? profile?.streak_days ?? 0;
        const previousBest = profile?.best_achievement_streak ?? 0;
        const lastLoginAt = profile?.last_login_at;

        const now = new Date();
        const next = calculateDailyStreakUpdate(
          lastLoginAt,
          previousStreak,
          previousBest,
          now,
        );
        let { currentStreak: nextStreak, bestStreak: nextBest } = next;
        let streakWasUpdated = false;

        if (next.shouldWrite) {
          let update = supabase
            .from("profiles")
            .update({
              last_login_at: now.toISOString(),
              achievement_streak: nextStreak,
              streak_days: nextStreak, // keep both fields in sync for XPReactor + others
              best_achievement_streak: nextBest,
            })
            .eq("id", userId);

          update = lastLoginAt
            ? update.eq("last_login_at", lastLoginAt)
            : update.is("last_login_at", null);

          const { data: updatedProfile, error: updateError } = await update
            .select("achievement_streak, best_achievement_streak, streak_days")
            .maybeSingle();

          if (updateError) throw updateError;

          if (updatedProfile) {
            streakWasUpdated = true;
          } else {
            // Another tab/session updated the same login day first; use its saved value.
            const { data: currentProfile, error: refreshError } = await supabase
              .from("profiles")
              .select("achievement_streak, best_achievement_streak, streak_days")
              .eq("id", userId)
              .single();

            if (refreshError) throw refreshError;
            nextStreak = currentProfile.achievement_streak ?? currentProfile.streak_days ?? 0;
            nextBest = currentProfile.best_achievement_streak ?? 0;
          }
        }

        if (cancelled) return;

        setCurrentStreak(nextStreak);
        setBestStreak(nextBest);
        onStreakUpdate?.(nextStreak);

        // 2. Award milestone achievements only when we just hit the number
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
  }, [userId, onStreakUpdate]);

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
    if (streak >= 365)
      return { label: "Legendary", color: "from-amber-500 to-orange-600" };
    if (streak >= 100)
      return { label: "Epic", color: "from-purple-500 to-pink-600" };
    if (streak >= 30)
      return { label: "Rare", color: "from-blue-500 to-cyan-600" };
    if (streak >= 7)
      return { label: "Uncommon", color: "from-green-500 to-emerald-600" };
    return { label: "Common", color: "from-gray-500 to-gray-600" };
  };

  const streakLevel = getStreakLevel(currentStreak);

  return (
    <div>
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 rebrand-streaks">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Daily Login Streak
            </h3>
            <Badge className={`bg-gradient-to-r ${streakLevel.color}`}>
              {streakLevel.label}
            </Badge>
          </div>

          {/* Current Streak */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {currentStreak}
              </span>
              <span className="text-lg text-muted-foreground">days</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Current daily login streak
            </p>
          </div>

          {/* Best Streak */}
          <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Best Streak</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {bestStreak} days
            </span>
          </div>

          {/* Milestones */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Next Milestones
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[7, 30, 100, 365].map((milestone) => (
                <div
                  key={milestone}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    currentStreak >= milestone
                      ? "bg-primary/20 border-primary/50"
                      : "bg-card/50 border-border"
                  }`}
                >
                  <p className="text-xs font-bold">{milestone}</p>
                  <p className="text-[10px] text-muted-foreground">days</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress to next milestone */}
          {(() => {
            const nextMilestone =
              [7, 30, 100, 365].find((m) => m > currentStreak) || 365;
            const progress = Math.min((currentStreak / nextMilestone) * 100, 100);

            return (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to {nextMilestone} days</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
};
