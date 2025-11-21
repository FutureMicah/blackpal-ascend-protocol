import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, PieChart, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsDashboardProps {
  userId: string;
}

interface ProgressData {
  date: string;
  achievements: number;
  xp: number;
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

interface RarityStats {
  rarity: string;
  count: number;
  total: number;
  completion: number;
}

export const AnalyticsDashboard = ({ userId }: AnalyticsDashboardProps) => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [rarityStats, setRarityStats] = useState<RarityStats[]>([]);
  const [totalAchievements, setTotalAchievements] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      // Get user achievements with dates
      const { data: userAchievements } = await supabase
        .from("user_achievements")
        .select(`
          awarded_at,
          achievements!inner(category, rarity, xp_reward)
        `)
        .eq("user_id", userId)
        .order("awarded_at");

      // Get all achievements for completion rate
      const { count: totalCount } = await supabase
        .from("achievements")
        .select("*", { count: "exact", head: true });

      setTotalAchievements(userAchievements?.length || 0);
      setCompletionRate(
        totalCount ? ((userAchievements?.length || 0) / totalCount) * 100 : 0
      );

      // Process progress over time (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split("T")[0];
      });

      const progressByDate: Record<string, { achievements: number; xp: number }> = {};
      last30Days.forEach((date) => {
        progressByDate[date] = { achievements: 0, xp: 0 };
      });

      userAchievements?.forEach((ua: any) => {
        const date = new Date(ua.awarded_at).toISOString().split("T")[0];
        if (progressByDate[date]) {
          progressByDate[date].achievements += 1;
          progressByDate[date].xp += ua.achievements?.xp_reward || 0;
        }
      });

      // Cumulative progress
      let cumulativeAchievements = 0;
      let cumulativeXp = 0;
      const progress = last30Days.map((date) => {
        cumulativeAchievements += progressByDate[date]?.achievements || 0;
        cumulativeXp += progressByDate[date]?.xp || 0;
        return {
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          achievements: cumulativeAchievements,
          xp: cumulativeXp,
        };
      });

      setProgressData(progress);

      // Category statistics
      const categoryMap: Record<string, number> = {};
      userAchievements?.forEach((ua: any) => {
        const category = ua.achievements?.category || "Other";
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      const total = Object.values(categoryMap).reduce((sum, count) => sum + count, 0);
      const categories = Object.entries(categoryMap).map(([category, count]) => ({
        category,
        count,
        percentage: (count / total) * 100,
      }));

      setCategoryStats(categories);

      // Rarity statistics
      const { data: allAchievements } = await supabase
        .from("achievements")
        .select("rarity");

      const rarityMap: Record<string, { earned: number; total: number }> = {};
      
      allAchievements?.forEach((achievement: any) => {
        const rarity = achievement.rarity;
        if (!rarityMap[rarity]) {
          rarityMap[rarity] = { earned: 0, total: 0 };
        }
        rarityMap[rarity].total += 1;
      });

      userAchievements?.forEach((ua: any) => {
        const rarity = ua.achievements?.rarity;
        if (rarity && rarityMap[rarity]) {
          rarityMap[rarity].earned += 1;
        }
      });

      const rarities = Object.entries(rarityMap).map(([rarity, stats]) => ({
        rarity,
        count: stats.earned,
        total: stats.total,
        completion: (stats.earned / stats.total) * 100,
      }));

      setRarityStats(rarities);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d", "#ffc658"];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Achievements</p>
              <p className="text-3xl font-bold">{totalAchievements}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-3xl font-bold">{completionRate.toFixed(1)}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Categories</p>
              <p className="text-3xl font-bold">{categoryStats.length}</p>
            </div>
            <PieChart className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">
            <Calendar className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="rarity">
            <BarChart3 className="h-4 w-4 mr-2" />
            Rarity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">30-Day Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="achievements"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Achievements"
                />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  name="XP"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category}: ${entry.percentage.toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {categoryStats.map((stat, index) => (
                  <motion.div
                    key={stat.category}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{stat.category}</span>
                    </div>
                    <Badge variant="outline">{stat.count}</Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="rarity">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rarity Completion</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rarityStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="rarity" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Earned" />
                <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 space-y-3">
              {rarityStats.map((stat, index) => (
                <motion.div
                  key={stat.rarity}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg bg-secondary/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{stat.rarity}</span>
                    <Badge variant="outline">
                      {stat.count}/{stat.total}
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${stat.completion}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.completion.toFixed(1)}% Complete
                  </p>
                </motion.div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
