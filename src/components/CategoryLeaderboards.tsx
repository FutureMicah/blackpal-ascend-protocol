import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  achievement_count: number;
  total_xp: number;
  rank: number;
}

interface CategoryLeaderboardsProps {
  userId: string;
}

export const CategoryLeaderboards = ({ userId }: CategoryLeaderboardsProps) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [leaderboards, setLeaderboards] = useState<Map<string, LeaderboardEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, [userId]);

  const loadLeaderboards = async () => {
    try {
      // Get all unique categories
      const { data: achievementData } = await supabase
        .from("achievements")
        .select("category");

      const uniqueCategories = [...new Set(achievementData?.map((a) => a.category) || [])];
      setCategories(uniqueCategories);

      // Load leaderboard for each category
      const leaderboardMap = new Map();
      
      for (const category of uniqueCategories) {
        // Get achievements in this category
        const { data: categoryAchievements } = await supabase
          .from("achievements")
          .select("id, xp_reward")
          .eq("category", category);

        if (!categoryAchievements || categoryAchievements.length === 0) continue;

        const achievementIds = categoryAchievements.map((a) => a.id);

        // Get user achievements in this category
        const { data: userAchievements } = await supabase
          .from("user_achievements")
          .select(`
            user_id,
            achievement_id,
            achievements!inner(xp_reward)
          `)
          .in("achievement_id", achievementIds);

        // Aggregate by user
        const userStats = new Map<string, { count: number; xp: number }>();
        userAchievements?.forEach((ua: any) => {
          const existing = userStats.get(ua.user_id) || { count: 0, xp: 0 };
          userStats.set(ua.user_id, {
            count: existing.count + 1,
            xp: existing.xp + (ua.achievements?.xp_reward || 0),
          });
        });

        // Get user profiles
        const userIds = Array.from(userStats.keys());
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds);

        // Create leaderboard entries
        const entries: LeaderboardEntry[] = profiles?.map((profile) => {
          const stats = userStats.get(profile.id)!;
          return {
            user_id: profile.id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            achievement_count: stats.count,
            total_xp: stats.xp,
            rank: 0,
          };
        }) || [];

        // Sort and assign ranks
        entries.sort((a, b) => b.total_xp - a.total_xp);
        entries.forEach((entry, index) => {
          entry.rank = index + 1;
        });

        leaderboardMap.set(category, entries.slice(0, 20));
      }

      setLeaderboards(leaderboardMap);
    } catch (error) {
      console.error("Error loading leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-500 border-yellow-500";
    if (rank === 2) return "bg-slate-400/20 text-slate-400 border-slate-400";
    if (rank === 3) return "bg-amber-600/20 text-amber-600 border-amber-600";
    return "";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-primary/10">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-sm">
            Compete with others in each category to reach the top of the leaderboard!
          </p>
        </div>
      </Card>

      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 6).map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-2">
            {leaderboards.get(category)?.map((entry, index) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`p-4 ${
                    entry.user_id === userId ? "ring-2 ring-primary" : ""
                  } ${entry.rank <= 3 ? getRankBadge(entry.rank) : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={entry.rank <= 3 ? "secondary" : "outline"}
                        className="w-12 h-12 flex items-center justify-center text-lg font-bold"
                      >
                        {getRankIcon(entry.rank) || entry.rank}
                      </Badge>

                      <Avatar>
                        <AvatarImage src={entry.avatar_url || ""} />
                        <AvatarFallback>{entry.display_name[0]}</AvatarFallback>
                      </Avatar>

                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          {entry.display_name}
                          {entry.user_id === userId && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {entry.achievement_count} achievements
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold">{entry.total_xp.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total XP</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {(!leaderboards.get(category) || leaderboards.get(category)!.length === 0) && (
              <Card className="p-12 text-center">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No rankings available yet</p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
