import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ProfileHeroCard } from "@/components/dashboard/ProfileHeroCard";
import { XPReactor } from "@/components/dashboard/XPReactor";
import { AchievementsCarousel } from "@/components/dashboard/AchievementsCarousel";
import { WalletSnapshot } from "@/components/dashboard/WalletSnapshot";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { useAchievements } from "@/hooks/use-achievements";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();

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
        await checkAndAwardAchievements({
          user_id: userId,
          event_type: 'level_reach',
          event_data: {
            level: data.rank_level || 1,
            xp_total: data.xp_points || 0
          }
        });

        await checkAndAwardAchievements({
          user_id: userId,
          event_type: 'xp_total',
          event_data: {
            xp_total: data.xp_points || 0
          }
        });
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
      {/* Particle background */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      </div>

      {/* Main content */}
      <div className="relative max-w-[1400px] mx-auto px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-12 gap-6"
        >
          {/* Left Column - Profile Card */}
          <div className="col-span-12 lg:col-span-3">
            <ProfileHeroCard profile={profile} user={user} />
          </div>

          {/* Middle Column - Main Content */}
          <div className="col-span-12 lg:col-span-6 space-y-6">
            <XPReactor profile={profile} />
            <AchievementsCarousel userId={profile.id} />
            <ActivityFeed userId={profile.id} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <WalletSnapshot userId={profile.id} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
