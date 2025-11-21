import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface AchievementNotificationProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    xp_reward: number;
  } | null;
  onClose: () => void;
}

export const AchievementNotification = ({ achievement, onClose }: AchievementNotificationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (achievement) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 500);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const isLegendary = achievement.rarity.toLowerCase() === "legendary";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <Card className={`relative overflow-hidden ${isLegendary ? 'border-2 border-amber-500' : ''}`}>
            {/* Legendary background effect */}
            {isLegendary && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ backgroundSize: "200% 200%" }}
              />
            )}

            <div className="relative p-6 space-y-3">
              {/* Close button */}
              <button
                onClick={() => {
                  setShow(false);
                  setTimeout(onClose, 500);
                }}
                className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Achievement Unlocked!</h3>
              </div>

              {/* Achievement content */}
              <div className="flex gap-4">
                <motion.div
                  className="text-5xl"
                  animate={isLegendary ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  } : {}}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  {achievement.icon}
                </motion.div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{achievement.name}</h4>
                    <Badge variant={isLegendary ? "default" : "secondary"}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  <div className="text-sm font-semibold text-primary">
                    +{achievement.xp_reward} XP
                  </div>
                </div>
              </div>
            </div>

            {/* Sparkle effects for legendary */}
            {isLegendary && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-amber-400 rounded-full"
                    initial={{
                      top: "50%",
                      left: "50%",
                      opacity: 1,
                    }}
                    animate={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.1,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  />
                ))}
              </>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
