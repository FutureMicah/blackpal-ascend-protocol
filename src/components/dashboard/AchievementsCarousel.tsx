import { motion } from "framer-motion";
import { Trophy, Lock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AchievementsCarouselProps {
  userId: string;
}

// Mock achievements data
const mockAchievements = [
  {
    id: 1,
    title: "First Steps",
    description: "Complete your profile",
    icon: "🎯",
    unlocked: true,
    date: "2025-11-15",
  },
  {
    id: 2,
    title: "Quick Learner",
    description: "Reach Level 5",
    icon: "⚡",
    unlocked: false,
    progress: 40,
  },
  {
    id: 3,
    title: "Trade Master",
    description: "Complete 10 successful trades",
    icon: "📈",
    unlocked: false,
    progress: 30,
  },
  {
    id: 4,
    title: "Community Star",
    description: "Help 5 other students",
    icon: "⭐",
    unlocked: false,
    progress: 0,
  },
];

export const AchievementsCarousel = ({ userId }: AchievementsCarouselProps) => {
  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Achievements
        </h2>
        <Badge variant="secondary">
          {mockAchievements.filter(a => a.unlocked).length} / {mockAchievements.length}
        </Badge>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mockAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            className={`relative p-4 rounded-xl border transition-all ${
              achievement.unlocked
                ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                : "bg-card/50 border-border hover:bg-card"
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.05 }}
          >
            {/* Icon */}
            <div className="text-4xl mb-2 text-center">
              {achievement.unlocked ? achievement.icon : <Lock className="w-8 h-8 mx-auto text-muted-foreground" />}
            </div>

            {/* Title */}
            <div className="text-sm font-semibold text-center mb-1">
              {achievement.title}
            </div>

            {/* Description */}
            <div className="text-xs text-muted-foreground text-center line-clamp-2">
              {achievement.description}
            </div>

            {/* Progress or Date */}
            {achievement.unlocked ? (
              <div className="text-xs text-primary text-center mt-2">
                {achievement.date}
              </div>
            ) : achievement.progress !== undefined ? (
              <div className="mt-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Glow effect for unlocked */}
            {achievement.unlocked && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/10 pointer-events-none"
                animate={{
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
