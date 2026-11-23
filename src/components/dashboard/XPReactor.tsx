import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, Flame } from "lucide-react";

interface XPReactorProps {
  profile: any;
}

export const XPReactor = ({ profile }: XPReactorProps) => {
  const currentXP = Math.max(0, Math.floor(profile?.xp_points ?? 0));
  const currentLevel = Math.max(1, Math.floor((currentXP / 1000) + 1));
  // Level N requires reaching N * 1000 total XP, so the band for the
  // current level is [(level-1)*1000, level*1000).
  const xpForNextLevel = currentLevel * 1000;
  const xpInBand = currentXP - (currentLevel - 1) * 1000;
  const xpProgress =
    xpForNextLevel > 0 ? Math.min(100, (xpInBand / 1000) * 100) : 0;

  // StreakTracker keeps achievement_streak and streak_days in sync.
  // Prefer achievement_streak so both widgets show the same number.
  const streakDays =
    profile?.achievement_streak ?? profile?.streak_days ?? 0;

  return (
    <motion.div
      className="glass-card p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          XP Reactor
        </h2>
        <div className="text-2xl font-bold text-primary">
          Level {currentLevel}
        </div>
      </div>

      {/* Reactor Orb Visual */}
      <div className="relative h-32 flex items-center justify-center">
        <div
          className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl"
        />
        <div
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/50"
        >
          <div className="text-center">
            <div className="text-xs text-white/70">XP</div>
            <div className="text-sm font-bold text-white">{currentXP}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {xpInBand.toLocaleString()} / 1000 XP to {xpForNextLevel.toLocaleString()}
          </span>
          <span className="text-primary font-semibold">
            {Math.floor(xpProgress)}%
          </span>
        </div>
        <Progress value={xpProgress} className="h-3" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Streak</div>
            <div className="text-lg font-bold text-foreground">
              {streakDays} days
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Multiplier</div>
            <div className="text-lg font-bold text-foreground">+2.0x</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
