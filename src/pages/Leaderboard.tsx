import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, Award, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_achievements: number;
  xp_points: number;
  rank: number;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);

      // Get all users with their achievement counts and XP
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp_points")
        .order("xp_points", { ascending: false });

      if (profilesError) throw profilesError;

      // Get achievement counts for each user
      const { data: achievementCounts, error: countsError } = await supabase
        .from("user_achievements")
        .select("user_id");

      if (countsError) throw countsError;

      // Count achievements per user
      const countMap = achievementCounts?.reduce((acc, ua) => {
        acc[ua.user_id] = (acc[ua.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Create leaderboard entries
      const entries: LeaderboardEntry[] = profiles?.map((profile, index) => ({
        user_id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        total_achievements: countMap[profile.id] || 0,
        xp_points: profile.xp_points || 0,
        rank: index + 1,
      })) || [];

      setLeaderboard(entries);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-amber-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-slate-400" />;
      case 3:
        return <Trophy className="h-6 w-6 text-amber-700" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50";
      case 2:
        return "bg-gradient-to-r from-slate-400/20 to-slate-500/20 border-slate-400/50";
      case 3:
        return "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-700/50";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-b">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Trophy className="h-10 w-10 text-primary" />
              Global Leaderboard
            </h1>
            <p className="text-muted-foreground">
              Top achievers ranked by XP and achievements
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card
              className={`${getRankColor(entry.rank)} ${
                entry.user_id === currentUserId ? "ring-2 ring-primary" : ""
              } transition-all hover:scale-[1.02]`}
            >
              <div className="p-6 flex items-center gap-6">
                {/* Rank */}
                <div className="flex-shrink-0 w-12 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <Avatar className="h-16 w-16">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {entry.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold truncate">
                      {entry.display_name}
                    </h3>
                    {entry.user_id === currentUserId && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      <span>{entry.total_achievements} achievements</span>
                    </div>
                  </div>
                </div>

                {/* XP */}
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {entry.xp_points.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">XP</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        {leaderboard.length === 0 && (
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">No Rankings Yet</h3>
            <p className="text-muted-foreground">
              Start earning achievements to appear on the leaderboard!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
