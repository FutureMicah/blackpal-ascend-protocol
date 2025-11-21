import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  expires_at: string;
  progress: number;
  target: number;
  rarity: string;
}

interface TimedChallengesProps {
  userId: string;
}

export const TimedChallenges = ({ userId }: TimedChallengesProps) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadChallenges();
    const interval = setInterval(loadChallenges, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [userId]);

  const loadChallenges = async () => {
    try {
      // In a real implementation, you'd have a challenges table
      // For now, we'll create mock time-limited challenges
      const mockChallenges: Challenge[] = [
        {
          id: "weekend_warrior",
          name: "Weekend Warrior",
          description: "Earn 5 achievements this weekend",
          icon: "⚔️",
          xp_reward: 500,
          expires_at: getNextSunday().toISOString(),
          progress: 2,
          target: 5,
          rarity: "epic",
        },
        {
          id: "daily_grind",
          name: "Daily Grind",
          description: "Complete 3 achievements today",
          icon: "💪",
          xp_reward: 200,
          expires_at: getEndOfDay().toISOString(),
          progress: 1,
          target: 3,
          rarity: "rare",
        },
        {
          id: "streak_master",
          name: "Streak Master",
          description: "Maintain a 7-day login streak",
          icon: "🔥",
          xp_reward: 1000,
          expires_at: addDays(7).toISOString(),
          progress: 3,
          target: 7,
          rarity: "legendary",
        },
      ];

      setChallenges(mockChallenges);
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-amber-500 to-orange-500";
      case "epic":
        return "from-violet-500 to-purple-500";
      case "rare":
        return "from-blue-500 to-cyan-500";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading challenges...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Time-Limited Challenges
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete before time runs out for bonus rewards
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{challenge.icon}</div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {challenge.name}
                        <Badge
                          className={`bg-gradient-to-r ${getRarityColor(challenge.rarity)} text-white border-0 text-xs`}
                        >
                          {challenge.rarity}
                        </Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {challenge.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{getTimeRemaining(challenge.expires_at)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Progress: {challenge.progress}/{challenge.target}
                      </span>
                      <span className="text-primary font-bold">
                        +{challenge.xp_reward} XP
                      </span>
                    </div>
                    
                    <Progress 
                      value={(challenge.progress / challenge.target) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {challenges.length === 0 && (
        <Card className="p-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">No Active Challenges</h3>
          <p className="text-muted-foreground">
            Check back soon for new time-limited challenges!
          </p>
        </Card>
      )}
    </div>
  );
};

// Helper functions
const getNextSunday = () => {
  const now = new Date();
  const daysUntilSunday = 7 - now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

const getEndOfDay = () => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
};

const addDays = (days: number) => {
  const now = new Date();
  now.setDate(now.getDate() + days);
  now.setHours(23, 59, 59, 999);
  return now;
};
