import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Crown, Star, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Season {
  id: string;
  season_number: number;
  season_name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface SeasonStats {
  season_xp: number;
  season_achievements: number;
  rank: number | null;
}

interface SeasonalChallengesProps {
  userId: string;
}

export const SeasonalChallenges = ({ userId }: SeasonalChallengesProps) => {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSeasonData();
  }, [userId]);

  const loadSeasonData = async () => {
    try {
      // Get current active season
      const { data: season, error: seasonError } = await supabase
        .from("achievement_seasons")
        .select("*")
        .eq("is_active", true)
        .single();

      if (seasonError && seasonError.code !== 'PGRST116') throw seasonError;

      setCurrentSeason(season);

      if (season) {
        // Get user's season stats
        const { data: stats, error: statsError } = await supabase
          .from("season_leaderboard")
          .select("*")
          .eq("season_id", season.id)
          .eq("user_id", userId)
          .single();

        if (statsError && statsError.code !== 'PGRST116') throw statsError;

        setSeasonStats(stats || { season_xp: 0, season_achievements: 0, rank: null });

        // Get top 10 players
        const { data: leaderboard, error: leaderboardError } = await supabase
          .from("season_leaderboard")
          .select(`
            season_xp,
            season_achievements,
            rank,
            profiles (
              display_name,
              avatar_url
            )
          `)
          .eq("season_id", season.id)
          .order("season_xp", { ascending: false })
          .limit(10);

        if (leaderboardError) throw leaderboardError;

        setTopPlayers(leaderboard || []);
      }
    } catch (error) {
      console.error("Error loading season data:", error);
      toast({
        title: "Error",
        description: "Failed to load season data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!currentSeason) return 0;
    const now = new Date();
    const end = new Date(currentSeason.end_date);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading season data...</div>
      </Card>
    );
  }

  if (!currentSeason) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">No Active Season</h3>
        <p className="text-muted-foreground">
          Check back soon for the next seasonal competition!
        </p>
      </Card>
    );
  }

  const daysRemaining = getDaysRemaining();
  const progress = seasonStats ? (seasonStats.season_achievements / 20) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Season Header */}
      <Card className="p-6 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">{currentSeason.season_name}</h2>
              <p className="text-sm text-muted-foreground">Season {currentSeason.season_number}</p>
            </div>
          </div>
          <Badge className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            {daysRemaining} days left
          </Badge>
        </div>

        <p className="text-muted-foreground mb-4">{currentSeason.description}</p>

        {/* User Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Your Season Progress</span>
            <span className="text-sm font-bold">{seasonStats?.season_achievements || 0} / 20</span>
          </div>
          <Progress value={progress} className="h-3" />
          
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{seasonStats?.season_xp || 0}</div>
              <div className="text-xs text-muted-foreground">Season XP</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{seasonStats?.season_achievements || 0}</div>
              <div className="text-xs text-muted-foreground">Achievements</div>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">#{seasonStats?.rank || "—"}</div>
              <div className="text-xs text-muted-foreground">Rank</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Season Leaderboard
        </h3>

        <div className="space-y-3">
          {topPlayers.map((player, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-4 p-3 rounded-lg ${
                index < 3 ? "bg-gradient-to-r from-primary/10 to-accent/10" : "bg-muted/30"
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {index === 0 && <Crown className="h-6 w-6 text-amber-500 mx-auto" />}
                {index === 1 && <Star className="h-6 w-6 text-slate-400 mx-auto" />}
                {index === 2 && <Star className="h-6 w-6 text-amber-700 mx-auto" />}
                {index > 2 && <span className="font-bold text-muted-foreground">#{index + 1}</span>}
              </div>

              {/* Player Info */}
              <div className="flex-1">
                <div className="font-semibold">{player.profiles?.display_name}</div>
                <div className="text-sm text-muted-foreground">
                  {player.season_achievements} achievements
                </div>
              </div>

              {/* XP */}
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{player.season_xp}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </motion.div>
          ))}
        </div>

        {topPlayers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No rankings yet this season. Be the first!</p>
          </div>
        )}
      </Card>

      {/* Season Rewards Preview */}
      <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          Season Rewards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <Crown className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <div className="font-bold">1st Place</div>
            <div className="text-sm text-muted-foreground">Legendary Badge + 5000 XP</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <div className="font-bold">2nd Place</div>
            <div className="text-sm text-muted-foreground">Epic Badge + 3000 XP</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg">
            <Star className="h-8 w-8 mx-auto mb-2 text-amber-700" />
            <div className="font-bold">3rd Place</div>
            <div className="text-sm text-muted-foreground">Rare Badge + 2000 XP</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
