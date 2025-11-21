import { motion } from "framer-motion";
import { Trophy, Lock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AchievementsCarouselProps {
  userId: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked: boolean;
  awarded_at?: string;
  progress?: any;
}

export const AchievementsCarousel = ({ userId }: AchievementsCarouselProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    try {
      // Get all achievements
      const { data: allAchievements, error: achError } = await supabase
        .from("achievements")
        .select("*")
        .order("rarity", { ascending: false });

      if (achError) throw achError;

      // Get user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("achievement_id, awarded_at, progress")
        .eq("user_id", userId);

      if (userError) throw userError;

      // Merge the data
      const merged = allAchievements?.map((ach) => {
        const userAch = userAchievements?.find((ua) => ua.achievement_id === ach.id);
        return {
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
          rarity: ach.rarity,
          unlocked: !!userAch,
          awarded_at: userAch?.awarded_at,
          progress: userAch?.progress,
        };
      }) || [];

      setAchievements(merged);
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <motion.div
        className="glass-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-center h-40">
          <div className="text-muted-foreground">Loading achievements...</div>
        </div>
      </motion.div>
    );
  }

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
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {achievements.filter(a => a.unlocked).length} / {achievements.length}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/achievements")}
          >
            View All
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {achievements.map((achievement, index) => (
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
              {achievement.name}
            </div>

            {/* Description */}
            <div className="text-xs text-muted-foreground text-center line-clamp-2">
              {achievement.description}
            </div>

            {/* Progress or Date */}
            {achievement.unlocked ? (
              <div className="text-xs text-primary text-center mt-2">
                {new Date(achievement.awarded_at!).toLocaleDateString()}
              </div>
            ) : achievement.progress ? (
              <div className="mt-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${achievement.progress.percent || 0}%` }}
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
