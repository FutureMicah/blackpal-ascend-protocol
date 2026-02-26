import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Users, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/FloatingNav";
import { ProfileHeroCard } from "@/components/dashboard/ProfileHeroCard";
import { XPReactor } from "@/components/dashboard/XPReactor";
import { AchievementsCarousel } from "@/components/dashboard/AchievementsCarousel";
import { WalletSnapshot } from "@/components/dashboard/WalletSnapshot";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AchievementNotification } from "@/components/AchievementNotification";
import { NotificationCenter } from "@/components/NotificationCenter";
import { StreakTracker } from "@/components/StreakTracker";
import { useAchievements, AwardedAchievement } from "@/hooks/use-achievements";
import { FriendActivityFeed } from "@/components/social/FriendActivityFeed";
import { ProfileComparison } from "@/components/ProfileComparison";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<AwardedAchievement | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [userStats, setUserStats] = useState({ totalXP: 0, totalAchievements: 0, rareAchievements: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();
  useRealtimeNotifications(user?.id ?? null);

  // Load user stats for comparison
  const loadUserStats = async (userId: string) => {
    try {
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (id, rarity)
        `)
        .eq("user_id", userId);

      const achievements = achievementsData?.map((ua: any) => ua.achievements).filter(Boolean) || [];
      const totalAchievements = achievements.length;
      const rareAchievements = achievements.filter(
        (a: any) => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary"
      ).length;

      setUserStats({
        totalXP: profile?.xp_points || 0,
        totalAchievements,
        rareAchievements,
      });
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

  useEffect(() => {
    if (profile) {
      loadUserStats(profile.id);
    }
  }, [profile]);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/");
        return;
      }

      setUser(session.user);
      await loadProfile(session.user.id);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Check for level and XP achievements
      if (data) {
        const levelAchievements = await checkAndAwardAchievements({
          user_id: userId,
          event_type: 'level_reach',
          event_data: {
            level: data.rank_level || 1,
            xp_total: data.xp_points || 0
          }
        });

        if (levelAchievements.length > 0) {
          setNotification(levelAchievements[0]);
        }

        const xpAchievements = await checkAndAwardAchievements({
          user_id: userId,
          event_type: 'xp_total',
          event_data: {
            xp_total: data.xp_points || 0
          }
        });

        if (xpAchievements.length > 0 && !notification) {
          setNotification(xpAchievements[0]);
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Achievement notification */}
      <AchievementNotification
        achievement={notification}
        onClose={() => setNotification(null)}
      />

      {/* Particle background */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      </div>

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Main content */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        {/* Header with Leaderboard, Compare, and Notifications */}
        <div className="flex justify-end gap-2 mb-4">
          {user && <NotificationCenter userId={user.id} />}
          <Button
            variant="outline"
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2"
            size="sm"
          >
            <GitCompare className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Compare</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/leaderboard")}
            className="flex items-center gap-2"
            size="sm"
          >
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Leaderboard</span>
          </Button>
        </div>

        {/* Profile Comparison Modal */}
        {showComparison && profile && (
          <ProfileComparison
            currentProfile={profile}
            currentStats={userStats}
            onClose={() => setShowComparison(false)}
          />
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6"
        >
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-3 order-1">
            <ProfileHeroCard 
              profile={profile} 
              user={user} 
              onProfileUpdate={() => loadProfile(user.id)}
            />
          </div>

          {/* Middle Column - Main Content */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6 order-3 lg:order-2">
            <XPReactor profile={profile} />
            <AchievementsCarousel userId={profile.id} />
            <ActivityFeed userId={profile.id} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-2 lg:order-3">
            <StreakTracker userId={profile.id} />
            <FriendActivityFeed userId={profile.id} maxItems={10} />
            <WalletSnapshot userId={profile.id} />
            
            {/* Quick Access to Hub */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={() => navigate("/achievements/hub")}
                className="w-full"
                size="lg"
              >
                <Trophy className="mr-2 h-5 w-5" />
                Achievement Hub
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
