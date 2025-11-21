import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Crown, Star, Check } from "lucide-react";
import { motion } from "framer-motion";

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_description: string;
  required_achievements: number;
  required_xp: number;
  required_category: string | null;
  reward_title: string | null;
  reward_avatar_url: string | null;
  reward_profile_badge: string | null;
  reward_currency: number;
  milestone_tier: number;
  is_unlocked?: boolean;
}

interface AchievementMilestonesProps {
  userId: string;
}

export const AchievementMilestones = ({ userId }: AchievementMilestonesProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [userStats, setUserStats] = useState({ achievements: 0, xp: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMilestones();
  }, [userId]);

  const loadMilestones = async () => {
    try {
      // Fetch user stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .single();

      const { count: achievementCount } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setUserStats({
        achievements: achievementCount || 0,
        xp: profile?.xp_points || 0,
      });

      // Fetch milestones
      const { data: milestoneData, error: milestoneError } = await supabase
        .from("achievement_milestones")
        .select("*")
        .order("milestone_tier");

      if (milestoneError) throw milestoneError;

      // Check which are unlocked
      const { data: unlockedData } = await supabase
        .from("user_milestones")
        .select("milestone_id")
        .eq("user_id", userId);

      const unlockedIds = new Set(unlockedData?.map((m) => m.milestone_id) || []);

      const milestonesWithStatus = milestoneData?.map((milestone) => ({
        ...milestone,
        is_unlocked: unlockedIds.has(milestone.id),
      })) || [];

      setMilestones(milestonesWithStatus);
    } catch (error) {
      console.error("Error loading milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const canUnlock = (milestone: Milestone): boolean => {
    if (milestone.is_unlocked) return false;
    if (userStats.achievements < milestone.required_achievements) return false;
    if (userStats.xp < milestone.required_xp) return false;
    return true;
  };

  const unlockMilestone = async (milestone: Milestone) => {
    try {
      // Unlock milestone
      await supabase.from("user_milestones").insert({
        user_id: userId,
        milestone_id: milestone.id,
      });

      // Add title if reward exists
      if (milestone.reward_title) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("unlocked_titles")
          .eq("id", userId)
          .single();

        const titles = profile?.unlocked_titles || [];
        await supabase
          .from("profiles")
          .update({
            unlocked_titles: [...titles, milestone.reward_title],
            active_title: milestone.reward_title,
          })
          .eq("id", userId);
      }

      // Add currency reward
      if (milestone.reward_currency > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("virtual_currency")
          .eq("id", userId)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({
              virtual_currency: profile.virtual_currency + milestone.reward_currency,
            })
            .eq("id", userId);
        }
      }

      toast({
        title: "Milestone Unlocked! 🎉",
        description: milestone.reward_title
          ? `You earned the title: ${milestone.reward_title}`
          : milestone.milestone_name,
      });

      loadMilestones();
    } catch (error) {
      console.error("Error unlocking milestone:", error);
      toast({
        title: "Error",
        description: "Failed to unlock milestone",
        variant: "destructive",
      });
    }
  };

  const getTierIcon = (tier: number) => {
    if (tier === 1) return <Star className="h-5 w-5" />;
    if (tier === 2) return <Award className="h-5 w-5" />;
    return <Crown className="h-5 w-5" />;
  };

  const getTierColor = (tier: number) => {
    if (tier === 1) return "bg-slate-500/20 border-slate-500";
    if (tier === 2) return "bg-blue-500/20 border-blue-500";
    return "bg-amber-500/20 border-amber-500";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-primary/10">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-2xl font-bold">{userStats.achievements}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{userStats.xp.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {milestones.filter((m) => m.is_unlocked).length}
            </p>
            <p className="text-xs text-muted-foreground">Milestones Unlocked</p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {milestones.map((milestone, index) => {
          const eligible = canUnlock(milestone);
          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`p-6 ${getTierColor(milestone.milestone_tier)} ${
                  milestone.is_unlocked ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-full bg-background/50">
                      {getTierIcon(milestone.milestone_tier)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{milestone.milestone_name}</h3>
                        {milestone.is_unlocked && <Check className="h-5 w-5 text-green-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {milestone.milestone_description}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {milestone.required_achievements} Achievements
                        </Badge>
                        <Badge variant="outline">{milestone.required_xp.toLocaleString()} XP</Badge>
                        {milestone.required_category && (
                          <Badge variant="secondary">{milestone.required_category}</Badge>
                        )}
                      </div>

                      {milestone.reward_title && (
                        <div className="mt-3 p-2 rounded-lg bg-primary/10">
                          <p className="text-sm">
                            <span className="font-semibold">Reward:</span> "{milestone.reward_title}"
                            title
                            {milestone.reward_currency > 0 &&
                              ` + ${milestone.reward_currency} currency`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => unlockMilestone(milestone)}
                    disabled={!eligible || milestone.is_unlocked}
                    size="lg"
                  >
                    {milestone.is_unlocked ? "Unlocked" : "Unlock"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}

        {milestones.length === 0 && (
          <Card className="p-12 text-center">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No milestones available yet</p>
          </Card>
        )}
      </div>
    </div>
  );
};
