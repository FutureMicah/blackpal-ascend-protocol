import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StreakTrackerProps {
  userId: string;
}

export const StreakTracker = ({ userId }: StreakTrackerProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreakData();
    trackLogin();
  }, [userId]);

  const loadStreakData = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("achievement_streak, best_achievement_streak")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setCurrentStreak(data?.achievement_streak || 0);
      setBestStreak(data?.best_achievement_streak || 0);
    } catch (error) {
      console.error("Error loading streak data:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackLogin = async () => {
    try {
      // Update last login timestamp
      const { error } = await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) throw error;

      // Check for streak milestones and award achievements
      const milestones = [7, 30, 100, 365];
      for (const milestone of milestones) {
        if (currentStreak === milestone) {
          await supabase.functions.invoke('award-achievement', {
            body: {
              user_id: userId,
              event_type: 'streak_milestone',
              event_data: {
                streak_days: milestone
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("Error tracking login:", error);
    }
  };

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
    if (streak >= 365) return { label: "Legendary", color: "from-amber-500 to-orange-600" };
    if (streak >= 100) return { label: "Epic", color: "from-purple-500 to-pink-600" };
    if (streak >= 30) return { label: "Rare", color: "from-blue-500 to-cyan-600" };
    if (streak >= 7) return { label: "Uncommon", color: "from-green-500 to-emerald-600" };
    return { label: "Common", color: "from-gray-500 to-gray-600" };
  };

  const streakLevel = getStreakLevel(currentStreak);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 rebrand-streaks">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Achievement Streak
            </h3>
            <Badge className={`bg-gradient-to-r ${streakLevel.color}`}>
              {streakLevel.label}
            </Badge>
          </div>

          {/* Current Streak */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <motion.span
                className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                key={currentStreak}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {currentStreak}
              </motion.span>
              <span className="text-lg text-muted-foreground">days</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Current achievement streak
            </p>
          </div>

          {/* Best Streak */}
          <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Best Streak</span>
            </div>
            <span className="text-lg font-bold text-primary">{bestStreak} days</span>
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
            const nextMilestone = [7, 30, 100, 365].find(m => m > currentStreak) || 365;
            const progress = Math.min((currentStreak / nextMilestone) * 100, 100);
            
            return (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress to {nextMilestone} days</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
    </motion.div>
  );
};
