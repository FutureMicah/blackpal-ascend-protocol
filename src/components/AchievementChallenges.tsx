import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Clock, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Challenge {
  id: string;
  challenge_name: string;
  challenge_description: string;
  challenge_type: string;
  objective_type: string;
  objective_target: number;
  xp_reward: number;
  currency_reward: number;
  start_date: string;
  end_date: string;
  challenge_icon: string;
  progress?: number;
  is_completed?: boolean;
}

interface AchievementChallengesProps {
  userId: string;
}

export const AchievementChallenges = ({ userId }: AchievementChallengesProps) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadChallenges();

    // Subscribe to challenge updates
    const channel = supabase
      .channel("challenge-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "achievement_challenges",
        },
        () => loadChallenges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadChallenges = async () => {
    try {
      const now = new Date().toISOString();

      // Fetch active challenges
      const { data: challengeData, error: challengeError } = await supabase
        .from("achievement_challenges")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .order("end_date");

      if (challengeError) throw challengeError;

      // Fetch user progress for each challenge
      const challengesWithProgress = await Promise.all(
        (challengeData || []).map(async (challenge) => {
          const { data: progressData } = await supabase
            .from("user_challenge_progress")
            .select("current_progress, is_completed")
            .eq("user_id", userId)
            .eq("challenge_id", challenge.id)
            .maybeSingle();

          return {
            ...challenge,
            progress: progressData?.current_progress || 0,
            is_completed: progressData?.is_completed || false,
          };
        })
      );

      setChallenges(challengesWithProgress);
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeChallenge = async (challenge: Challenge) => {
    if (challenge.progress! < challenge.objective_target) {
      toast({
        title: "Challenge Not Complete",
        description: "You haven't reached the objective yet!",
        variant: "destructive",
      });
      return;
    }

    try {
      // Mark as completed
      await supabase
        .from("user_challenge_progress")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("challenge_id", challenge.id);

      // Award rewards
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points, virtual_currency")
        .eq("id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            xp_points: profile.xp_points + challenge.xp_reward,
            virtual_currency: profile.virtual_currency + challenge.currency_reward,
          })
          .eq("id", userId);
      }

      toast({
        title: "Challenge Completed! 🎉",
        description: `Earned ${challenge.xp_reward} XP and ${challenge.currency_reward} currency!`,
      });

      loadChallenges();
    } catch (error) {
      console.error("Error completing challenge:", error);
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const remaining = new Date(endDate).getTime() - Date.now();
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const dailyChallenges = challenges.filter((c) => c.challenge_type === "daily");
  const weeklyChallenges = challenges.filter((c) => c.challenge_type === "weekly");

  return (
    <Tabs defaultValue="daily" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="daily">
          <Zap className="h-4 w-4 mr-2" />
          Daily Challenges
        </TabsTrigger>
        <TabsTrigger value="weekly">
          <Target className="h-4 w-4 mr-2" />
          Weekly Challenges
        </TabsTrigger>
      </TabsList>

      <TabsContent value="daily" className="space-y-4">
        {dailyChallenges.map((challenge, index) => {
          const progressPercentage = (challenge.progress! / challenge.objective_target) * 100;
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 ${challenge.is_completed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{challenge.challenge_icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{challenge.challenge_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {challenge.challenge_description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {challenge.progress}/{challenge.objective_target}
                        </span>
                      </div>
                      <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>{challenge.xp_reward} XP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-lg">💰</span>
                        <span>{challenge.currency_reward}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getTimeRemaining(challenge.end_date)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => completeChallenge(challenge)}
                    disabled={challenge.is_completed || challenge.progress! < challenge.objective_target}
                    className="ml-4"
                  >
                    {challenge.is_completed ? "Completed" : "Claim"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {dailyChallenges.length === 0 && (
          <Card className="p-12 text-center">
            <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No daily challenges available</p>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="weekly" className="space-y-4">
        {weeklyChallenges.map((challenge, index) => {
          const progressPercentage = (challenge.progress! / challenge.objective_target) * 100;
          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 ${challenge.is_completed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{challenge.challenge_icon}</span>
                      <div>
                        <h3 className="font-semibold text-lg">{challenge.challenge_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {challenge.challenge_description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">
                          {challenge.progress}/{challenge.objective_target}
                        </span>
                      </div>
                      <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span>{challenge.xp_reward} XP</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-lg">💰</span>
                        <span>{challenge.currency_reward}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getTimeRemaining(challenge.end_date)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => completeChallenge(challenge)}
                    disabled={challenge.is_completed || challenge.progress! < challenge.objective_target}
                    className="ml-4"
                  >
                    {challenge.is_completed ? "Completed" : "Claim"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {weeklyChallenges.length === 0 && (
          <Card className="p-12 text-center">
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No weekly challenges available</p>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};
