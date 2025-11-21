import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Award } from "lucide-react";

interface CinematicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
    xp_reward: number;
  } | null;
}

export const CinematicModal = ({ open, onOpenChange, achievement }: CinematicModalProps) => {
  if (!achievement) return null;

  const isLegendary = achievement.rarity.toLowerCase() === "legendary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-background/95 backdrop-blur-xl border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Achievement Cinematic
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-video bg-gradient-to-br from-primary/20 via-background to-accent/20 rounded-lg overflow-hidden">
          {/* Legendary effects */}
          {isLegendary && (
            <>
              {/* Animated rays */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-full bg-gradient-to-b from-amber-500/50 to-transparent origin-bottom"
                  style={{
                    transform: `rotate(${i * 45}deg)`,
                  }}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scaleY: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.1,
                    repeat: Infinity,
                  }}
                />
              ))}

              {/* Particle effects */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-2 h-2 bg-amber-400 rounded-full"
                  initial={{
                    top: "50%",
                    left: "50%",
                    opacity: 0,
                  }}
                  animate={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.05,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              ))}
            </>
          )}

          {/* Center icon */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            <motion.div
              className="text-9xl"
              animate={isLegendary ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              } : {
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {achievement.icon}
            </motion.div>
          </motion.div>

          {/* Glow effect */}
          <motion.div
            className={`absolute inset-0 ${
              isLegendary
                ? "bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30"
                : "bg-primary/20"
            } blur-3xl`}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Achievement details */}
        <motion.div
          className="space-y-4 p-6 bg-card rounded-lg border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{achievement.icon}</div>
              <div>
                <h3 className="text-2xl font-bold">{achievement.name}</h3>
                <Badge
                  className={
                    isLegendary
                      ? "bg-gradient-to-r from-amber-500 to-orange-600"
                      : ""
                  }
                >
                  {achievement.rarity}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Award className="h-6 w-6" />
              +{achievement.xp_reward} XP
            </div>
          </div>

          <p className="text-muted-foreground">{achievement.description}</p>

          {isLegendary && (
            <motion.div
              className="text-center text-amber-500 font-bold text-xl"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⭐ LEGENDARY ACHIEVEMENT ⭐
            </motion.div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
