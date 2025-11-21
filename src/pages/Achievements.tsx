import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lock, Play, Award, Search, Filter, BarChart3, GitBranch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CinematicModal } from "@/components/CinematicModal";
import { AchievementShare } from "@/components/AchievementShare";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  xp_reward: number;
  cinematic_id: string | null;
  unlocked: boolean;
  awarded_at?: string;
  progress?: number;
  unlock_condition?: any;
}

const Achievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filteredAchievements, setFilteredAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showCinematic, setShowCinematic] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, xp_points")
        .eq("id", user.id)
        .single();
      
      setUserProfile(profile);

      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("category", { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("achievement_id, awarded_at, progress, cinematic_watched")
        .eq("user_id", user.id);

      if (userError) throw userError;

      // Merge data
      const mergedAchievements = allAchievements?.map((achievement) => {
        const userAchievement = userAchievements?.find(
          (ua) => ua.achievement_id === achievement.id
        );

        // Extract progress as number
        let progressValue = 0;
        if (userAchievement?.progress && typeof userAchievement.progress === 'object') {
          progressValue = (userAchievement.progress as any).current || 0;
        }

        return {
          ...achievement,
          unlocked: !!userAchievement,
          awarded_at: userAchievement?.awarded_at,
          progress: progressValue,
          unlock_condition: achievement.unlock_condition,
        };
      }) || [];

      setAchievements(mergedAchievements);
      setFilteredAchievements(mergedAchievements);
    } catch (error) {
      console.error("Error loading achievements:", error);
      toast({
        title: "Error",
        description: "Failed to load achievements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter achievements
  useEffect(() => {
    let filtered = [...achievements];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }

    // Rarity filter
    if (rarityFilter !== "all") {
      filtered = filtered.filter((a) => a.rarity.toLowerCase() === rarityFilter);
    }

    // Status filter
    if (statusFilter === "unlocked") {
      filtered = filtered.filter((a) => a.unlocked);
    } else if (statusFilter === "locked") {
      filtered = filtered.filter((a) => !a.unlocked);
    }

    setFilteredAchievements(filtered);
  }, [achievements, searchQuery, categoryFilter, rarityFilter, statusFilter]);

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "legendary":
        return "bg-gradient-to-r from-amber-500 to-orange-600";
      case "epic":
        return "bg-gradient-to-r from-purple-500 to-pink-600";
      case "rare":
        return "bg-gradient-to-r from-blue-500 to-cyan-600";
      case "uncommon":
        return "bg-gradient-to-r from-green-500 to-emerald-600";
      default:
        return "bg-muted";
    }
  };

  const getProgressFromCondition = (achievement: Achievement): number => {
    if (achievement.unlocked) return 100;
    
    const condition = achievement.unlock_condition;
    if (!condition) return 0;

    // This is a simplified example - in reality you'd fetch actual user stats
    // For now, return a random progress for locked achievements
    return Math.floor(Math.random() * 80);
  };

  const replayCinematic = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShowCinematic(true);
  };

  const groupedAchievements = filteredAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const categories = Array.from(new Set(achievements.map(a => a.category)));
  const rarities = Array.from(new Set(achievements.map(a => a.rarity.toLowerCase())));

  return (
    <div className="min-h-screen bg-background">
      <CinematicModal
        open={showCinematic}
        onOpenChange={setShowCinematic}
        achievement={selectedAchievement}
      />
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-b">
        <div className="max-w-7xl mx-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/achievements/stats")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistics
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/achievements/paths")}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Paths & Challenges
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Achievement Vault</h1>
            <p className="text-muted-foreground">
              Track your progress and unlock legendary rewards
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {unlockedCount}/{totalCount}
              </span>
              <span className="text-muted-foreground">Unlocked</span>
            </div>
            <Progress value={(unlockedCount / totalCount) * 100} className="flex-1 max-w-md" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search achievements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Rarity filter */}
          <Select value={rarityFilter} onValueChange={setRarityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Rarities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              {rarities.map((rarity) => (
                <SelectItem key={rarity} value={rarity}>
                  {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unlocked">Unlocked</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="max-w-7xl mx-auto p-6 space-y-12">
        {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold mb-6 capitalize flex items-center gap-2">
              <span className="w-1 h-8 bg-primary rounded-full" />
              {category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryAchievements.map((achievement, index) => {
                const progress = getProgressFromCondition(achievement);
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className={`relative overflow-hidden transition-all duration-300 ${
                        achievement.unlocked
                          ? "hover:scale-105 hover:shadow-xl cursor-pointer"
                          : "opacity-75"
                      }`}
                    >
                      {/* Rarity Accent */}
                      <div className={`h-2 ${getRarityColor(achievement.rarity)}`} />

                      <div className="p-6 space-y-4">
                        {/* Icon & Lock */}
                        <div className="flex items-start justify-between">
                          <div className="relative">
                            <div
                              className={`text-6xl ${
                                achievement.unlocked ? "" : "grayscale blur-sm"
                              }`}
                            >
                              {achievement.icon}
                            </div>
                            {!achievement.unlocked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <Badge variant={achievement.unlocked ? "default" : "secondary"}>
                            {achievement.rarity}
                          </Badge>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                          <h3 className="font-bold text-xl">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>

                        {/* Progress or Award Date */}
                        {achievement.unlocked ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Award className="h-4 w-4" />
                              <span>
                                Unlocked{" "}
                                {achievement.awarded_at &&
                                  new Date(achievement.awarded_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                              <span>+{achievement.xp_reward} XP</span>
                            </div>
                            <div className="flex gap-2">
                              {achievement.cinematic_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => replayCinematic(achievement)}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Replay
                                </Button>
                              )}
                              {userProfile && (
                                <AchievementShare
                                  achievement={achievement}
                                  userStats={{
                                    displayName: userProfile.display_name,
                                    xpPoints: userProfile.xp_points || 0,
                                    achievementCount: unlockedCount,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold">{progress}%</span>
                            </div>
                            <Progress value={progress} />
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Achievements;
