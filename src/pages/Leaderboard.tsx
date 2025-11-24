import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Award, Crown, Zap, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateProfileCompletion } from "@/lib/profile-utils";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_achievements: number;
  xp_points: number;
  streak_days: number;
  best_achievement_streak: number;
  rarest_achievement_count: number;
  rank: number;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [featuredProfiles, setFeaturedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("xp");
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

      // Get all users with their stats
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("xp_points", { ascending: false });

      if (profilesError) throw profilesError;

      // Calculate featured profiles (100% complete + custom theme)
      const featured = profiles
        ?.filter(profile => {
          const completion = calculateProfileCompletion(profile);
          return completion.isComplete && completion.hasCustomTheme;
        })
        .slice(0, 3) || [];
      
      setFeaturedProfiles(featured);

      // Get achievement counts
      const { data: achievementCounts, error: countsError } = await supabase
        .from("user_achievements")
        .select("user_id, achievement_id");

      if (countsError) throw countsError;

      // Get rarity info
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("id, rarity");

      if (achievementsError) throw achievementsError;

      // Count achievements per user and rarest achievements
      const countMap = achievementCounts?.reduce((acc, ua) => {
        acc[ua.user_id] = (acc[ua.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const rarestMap = achievementCounts?.reduce((acc, ua) => {
        const achievement = achievements?.find(a => a.id === ua.achievement_id);
        if (achievement?.rarity === 'legendary' || achievement?.rarity === 'mythic') {
          acc[ua.user_id] = (acc[ua.user_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Create leaderboard entries
      const entries: LeaderboardEntry[] = profiles?.map((profile, index) => ({
        user_id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        total_achievements: countMap[profile.id] || 0,
        xp_points: profile.xp_points || 0,
        streak_days: profile.streak_days || 0,
        best_achievement_streak: profile.best_achievement_streak || 0,
        rarest_achievement_count: rarestMap[profile.id] || 0,
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

  const sortedByTab = (tab: string) => {
    return [...leaderboard].sort((a, b) => {
      switch (tab) {
        case "xp":
          return b.xp_points - a.xp_points;
        case "achievements":
          return b.total_achievements - a.total_achievements;
        case "streak":
          return b.best_achievement_streak - a.best_achievement_streak;
        case "rarest":
          return b.rarest_achievement_count - a.rarest_achievement_count;
        default:
          return 0;
      }
    }).map((entry, index) => ({ ...entry, rank: index + 1 }));
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], statKey: keyof LeaderboardEntry, icon: React.ReactNode, label: string) => (
    <div className="space-y-4">
      {entries.map((entry, index) => (
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
                    {icon}
                    <span>{label}</span>
                  </div>
                </div>
              </div>

              {/* Stat */}
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {typeof entry[statKey] === 'number' ? entry[statKey].toLocaleString() : entry[statKey]}
                </div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

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
              Top achievers ranked by different metrics
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Tabs */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Featured Profiles Section */}
        {featuredProfiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-amber-500 fill-current" />
                  Featured Profiles This Week
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Exceptional profiles with 100% completion and custom themes
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {featuredProfiles.map((profile, index) => {
                    const completion = calculateProfileCompletion(profile);
                    return (
                      <motion.div
                        key={profile.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card
                          className="glass-card hover-scale cursor-pointer border-2 border-amber-500/30"
                          onClick={() => navigate(`/profile/${profile.id}`)}
                        >
                          <CardContent className="p-4 text-center space-y-3">
                            <div className="relative inline-block">
                              <Avatar className="w-20 h-20 border-4 border-amber-500/50">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback>
                                  {profile.display_name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                <Crown className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            
                            <div>
                              <h3 className="font-bold truncate">{profile.display_name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {profile.xp_points || 0} XP
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-1 justify-center">
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                                100% Complete
                              </Badge>
                              {completion.hasCustomTheme && (
                                <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-xs">
                                  Themed
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="xp" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              XP
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="streak" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Best Streak
            </TabsTrigger>
            <TabsTrigger value="rarest" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Rarest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="xp">
            {renderLeaderboard(sortedByTab("xp"), "xp_points", <Zap className="h-4 w-4" />, "XP")}
          </TabsContent>

          <TabsContent value="achievements">
            {renderLeaderboard(sortedByTab("achievements"), "total_achievements", <Award className="h-4 w-4" />, "Achievements")}
          </TabsContent>

          <TabsContent value="streak">
            {renderLeaderboard(sortedByTab("streak"), "best_achievement_streak", <Trophy className="h-4 w-4" />, "Best Streak")}
          </TabsContent>

          <TabsContent value="rarest">
            {renderLeaderboard(sortedByTab("rarest"), "rarest_achievement_count", <Star className="h-4 w-4" />, "Legendary+")}
          </TabsContent>
        </Tabs>

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
