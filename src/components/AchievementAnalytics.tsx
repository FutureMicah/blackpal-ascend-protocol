import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Sparkles, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AnalyticsData {
  velocityData: Array<{ date: string; xp: number; achievements: number }>;
  predictions: Array<{ achievement: string; icon: string; probability: number; estimatedDays: number }>;
  recommendations: Array<{ category: string; reason: string; nextSteps: string[] }>;
  stats: {
    avgXpPerDay: number;
    avgAchievementsPerWeek: number;
    currentStreak: number;
    projectedNextMilestone: string;
  };
}

interface AchievementAnalyticsProps {
  userId: string;
}

export const AchievementAnalytics = ({ userId }: AchievementAnalyticsProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      // Get user achievements with timestamps
      const { data: userAchievements, error: achievementsError } = await supabase
        .from("user_achievements")
        .select(`
          awarded_at,
          achievements (
            xp_reward,
            category,
            name,
            icon
          )
        `)
        .eq("user_id", userId)
        .order("awarded_at", { ascending: true });

      if (achievementsError) throw achievementsError;

      // Get user profile for current stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points, streak_days")
        .eq("id", userId)
        .single();

      // Calculate velocity data (last 30 days)
      const velocityData = calculateVelocity(userAchievements || []);
      
      // Generate predictions based on patterns
      const predictions = await generatePredictions(userId, userAchievements || []);
      
      // Create personalized recommendations
      const recommendations = generateRecommendations(userAchievements || [], profile);
      
      // Calculate statistics
      const stats = calculateStats(userAchievements || [], profile);

      setAnalytics({
        velocityData,
        predictions,
        recommendations,
        stats,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVelocity = (achievements: any[]) => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const dailyData: Record<string, { xp: number; achievements: number }> = {};

    achievements
      .filter(ua => new Date(ua.awarded_at) >= last30Days)
      .forEach(ua => {
        const date = new Date(ua.awarded_at).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { xp: 0, achievements: 0 };
        }
        dailyData[date].xp += ua.achievements?.xp_reward || 0;
        dailyData[date].achievements += 1;
      });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const generatePredictions = async (userId: string, achievements: any[]) => {
    // Get all available achievements
    const { data: allAchievements } = await supabase
      .from("achievements")
      .select("id, name, icon, category, unlock_condition");

    if (!allAchievements) return [];

    const unlockedIds = new Set(achievements.map(ua => ua.achievement_id));
    const locked = allAchievements.filter(a => !unlockedIds.has(a.id));

    // Simple prediction based on category activity
    const categoryActivity: Record<string, number> = {};
    achievements.forEach(ua => {
      const cat = ua.achievements?.category;
      if (cat) categoryActivity[cat] = (categoryActivity[cat] || 0) + 1;
    });

    return locked
      .slice(0, 5)
      .map(a => {
        const categoryCount = categoryActivity[a.category] || 0;
        const probability = Math.min(95, 30 + categoryCount * 10);
        const estimatedDays = Math.max(1, Math.floor((100 - probability) / 5));
        
        return {
          achievement: a.name,
          icon: a.icon,
          probability,
          estimatedDays,
        };
      })
      .sort((a, b) => b.probability - a.probability);
  };

  const generateRecommendations = (achievements: any[], profile: any) => {
    const categories: Record<string, number> = {};
    achievements.forEach(ua => {
      const cat = ua.achievements?.category;
      if (cat) categories[cat] = (categories[cat] || 0) + 1;
    });

    const recommendations = [];

    // Category-based recommendations
    const topCategory = Object.entries(categories)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    if (topCategory) {
      recommendations.push({
        category: "Continue Your Strength",
        reason: `You're excelling in ${topCategory[0]} with ${topCategory[1]} achievements`,
        nextSteps: [
          `Complete advanced ${topCategory[0]} challenges`,
          "Share your progress with friends",
          "Help others in this category",
        ],
      });
    }

    // Streak recommendation
    if (profile?.streak_days < 7) {
      recommendations.push({
        category: "Build Your Streak",
        reason: "Consistency is key to unlocking milestone achievements",
        nextSteps: [
          "Log in daily for the next 7 days",
          "Complete at least one achievement per day",
          "Set a reminder for daily check-ins",
        ],
      });
    }

    // Exploration recommendation
    const unexploredCategories = ["Profile", "Vault", "Trades", "Referrals"]
      .filter(cat => !categories[cat]);

    if (unexploredCategories.length > 0) {
      recommendations.push({
        category: "Explore New Areas",
        reason: `You haven't tried ${unexploredCategories[0]} achievements yet`,
        nextSteps: [
          `Complete your first ${unexploredCategories[0]} achievement`,
          "Discover hidden rewards in new categories",
          "Unlock achievement paths by diversifying",
        ],
      });
    }

    return recommendations;
  };

  const calculateStats = (achievements: any[], profile: any) => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const recentAchievements = achievements.filter(
      ua => new Date(ua.awarded_at) >= last7Days
    );

    const totalXp = achievements.reduce(
      (sum, ua) => sum + (ua.achievements?.xp_reward || 0),
      0
    );

    const daysActive = new Set(
      achievements.map(ua => new Date(ua.awarded_at).toISOString().split('T')[0])
    ).size;

    return {
      avgXpPerDay: daysActive > 0 ? Math.round(totalXp / daysActive) : 0,
      avgAchievementsPerWeek: achievements.length > 0 
        ? Math.round((achievements.length / daysActive) * 7) 
        : 0,
      currentStreak: profile?.streak_days || 0,
      projectedNextMilestone: achievements.length >= 50 
        ? "100 Achievements" 
        : achievements.length >= 20 
        ? "50 Achievements" 
        : "20 Achievements",
    };
  };

  if (loading || !analytics) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading analytics...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{analytics.stats.avgXpPerDay}</div>
              <div className="text-xs text-muted-foreground">XP / Day</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{analytics.stats.avgAchievementsPerWeek}</div>
              <div className="text-xs text-muted-foreground">Achievements / Week</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{analytics.stats.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <div className="text-sm font-bold">{analytics.stats.projectedNextMilestone}</div>
              <div className="text-xs text-muted-foreground">Next Milestone</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Velocity Chart */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progress Velocity (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={analytics.velocityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="xp" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="XP Earned"
            />
            <Line 
              type="monotone" 
              dataKey="achievements" 
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              name="Achievements"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Predictions */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Predicted Next Unlocks
        </h3>
        <div className="space-y-3">
          {analytics.predictions.map((pred, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{pred.icon}</span>
                <div>
                  <div className="font-semibold">{pred.achievement}</div>
                  <div className="text-sm text-muted-foreground">
                    ~{pred.estimatedDays} days away
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{pred.probability}%</div>
                <Progress value={pred.probability} className="w-24 h-2" />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Personalized Recommendations
        </h3>
        <div className="space-y-4">
          {analytics.recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-muted/30 rounded-lg space-y-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{rec.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{rec.reason}</p>
              <ul className="space-y-1 text-sm">
                {rec.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
};
