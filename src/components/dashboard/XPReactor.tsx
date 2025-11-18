import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, Flame } from "lucide-react";

interface XPReactorProps {
  profile: any;
}

export const XPReactor = ({ profile }: XPReactorProps) => {
  const currentXP = profile.xp_points || 0;
  const currentLevel = profile.rank_level || 1;
  const xpForNextLevel = currentLevel * 1000; // Simple calculation
  const xpProgress = (currentXP % xpForNextLevel) / xpForNextLevel * 100;

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
        <motion.div
          className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/50"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="text-center">
            <div className="text-xs text-white/70">XP</div>
            <div className="text-sm font-bold text-white">{currentXP}</div>
          </div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {currentXP % xpForNextLevel} / {xpForNextLevel} XP
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
              {profile.streak_days || 0} days
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
