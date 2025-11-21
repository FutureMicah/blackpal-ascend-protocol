import { useEffect, useState } from "react";
import { AchievementAnalytics } from "@/components/AchievementAnalytics";
import { SeasonalChallenges } from "@/components/SeasonalChallenges";
import { BadgePresets } from "@/components/BadgePresets";
import { FriendActivityFeed } from "@/components/FriendActivityFeed";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, Award, Users, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AchievementStat {
  id: string;
  name: string;
  category: string;
  rarity: string;
  unlock_count: number;
  unlock_percentage: number;
}

interface CategoryProgress {
  category: string;
  unlocked: number;
  total: number;
  percentage: number;
}

const AchievementStats = () => {
  const [stats, setStats] = useState<AchievementStat[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);

      // Get achievement statistics
      const { data: achievementStats, error: statsError } = await supabase
        .from("achievement_stats")
        .select("*")
        .order("unlock_percentage", { ascending: false });

      if (statsError) throw statsError;

      setStats(achievementStats || []);

      // Calculate category progress
      const { data: allAchievements } = await supabase
        .from("achievements")
        .select("id, category");

      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user.id);

      const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);
      
      const categoryMap = new Map<string, { unlocked: number; total: number }>();
      allAchievements?.forEach(ach => {
        if (!categoryMap.has(ach.category)) {
          categoryMap.set(ach.category, { unlocked: 0, total: 0 });
        }
        const cat = categoryMap.get(ach.category)!;
        cat.total++;
        if (unlockedIds.has(ach.id)) {
          cat.unlocked++;
        }
      });

      const categoryData = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        unlocked: data.unlocked,
        total: data.total,
        percentage: Math.round((data.unlocked / data.total) * 100),
      }));

      setCategoryProgress(categoryData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const rarestAchievements = [...stats]
    .sort((a, b) => a.unlock_percentage - b.unlock_percentage)
    .slice(0, 5);

  const mostCommonAchievements = [...stats]
    .sort((a, b) => b.unlock_percentage - a.unlock_percentage)
    .slice(0, 5);

  const rarityData = stats.reduce((acc, stat) => {
    const existing = acc.find(item => item.rarity === stat.rarity);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ rarity: stat.rarity, count: 1 });
    }
    return acc;
  }, [] as { rarity: string; count: number }[]);

  const COLORS = {
    legendary: '#f59e0b',
    epic: '#a855f7',
    rare: '#3b82f6',
    uncommon: '#10b981',
    common: '#6b7280',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 to-accent/20 border-b">
        <div className="max-w-7xl mx-auto p-6 space-y-4">
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
              <BarChart3 className="h-8 w-8 text-primary" />
              Achievement Statistics
            </h1>
            <p className="text-muted-foreground">
              Detailed analytics and insights into achievement progress
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Achievements</p>
                  <p className="text-3xl font-bold">{stats.length}</p>
                </div>
                <Award className="h-12 w-12 text-primary/30" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Unlock Rate</p>
                  <p className="text-3xl font-bold">
                    {Math.round(stats.reduce((acc, s) => acc + s.unlock_percentage, 0) / stats.length)}%
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-primary/30" />
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Unlocks</p>
                  <p className="text-3xl font-bold">
                    {stats.reduce((acc, s) => acc + s.unlock_count, 0)}
                  </p>
                </div>
                <Users className="h-12 w-12 text-primary/30" />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Category Progress</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="unlocked" fill="hsl(var(--primary))" name="Unlocked" />
                  <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Rarity Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Rarity Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rarityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.rarity}: ${entry.count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {rarityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.rarity.toLowerCase() as keyof typeof COLORS] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Rarest and Most Common */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rarest Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Rarest Achievements</h3>
              <div className="space-y-4">
                {rarestAchievements.map((achievement, index) => (
                  <div key={achievement.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-semibold">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{achievement.unlock_percentage.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">{achievement.unlock_count} unlocks</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Most Common Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Most Common Achievements</h3>
              <div className="space-y-4">
                {mostCommonAchievements.map((achievement, index) => (
                  <div key={achievement.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-semibold">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{achievement.unlock_percentage.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">{achievement.unlock_count} unlocks</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Unlock Rate Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Unlock Rate Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="unlock_percentage" stroke="hsl(var(--primary))" name="Unlock %" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Achievement Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {userId && <AchievementAnalytics userId={userId} />}
        </motion.div>

        {/* Seasonal Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          {userId && <SeasonalChallenges userId={userId} />}
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            {userId && <BadgePresets userId={userId} />}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            {userId && <FriendActivityFeed userId={userId} />}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AchievementStats;
