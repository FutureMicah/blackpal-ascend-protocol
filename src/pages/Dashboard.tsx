import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, Users, GitCompare, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FloatingNav } from "@/components/FloatingNav";
import { ProfileHeroCard } from "@/components/dashboard/ProfileHeroCard";
import { XPReactor } from "@/components/dashboard/XPReactor";
import { AchievementsCarousel } from "@/components/dashboard/AchievementsCarousel";
import { WalletSnapshot } from "@/components/dashboard/WalletSnapshot";
import { BtaxWalletOverview } from "@/components/dashboard/BtaxWalletOverview";
import { WalletHero } from "@/components/dashboard/WalletHero";
import { PaymentHistoryPanel } from "@/components/dashboard/PaymentHistoryPanel";
import { KycStatusBanner } from "@/components/dashboard/KycStatusBanner";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AchievementNotification } from "@/components/AchievementNotification";
import { NotificationCenter } from "@/components/NotificationCenter";
import { StreakTracker } from "@/components/StreakTracker";
import { useAchievements, AwardedAchievement } from "@/hooks/use-achievements";
import { FriendActivityFeed } from "@/components/social/FriendActivityFeed";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { SessionLockScreen } from "@/components/security/SessionLockScreen";

// Below-fold / on-demand panels: split out of the dashboard first-paint
// chunk. Mounting order unchanged; Suspense fallback renders nothing so
// no layout shift. Animations on the page itself are untouched.
const SecurityPanel = lazy(() =>
  import("@/components/security/SecurityPanel").then((m) => ({ default: m.SecurityPanel }))
);
const ProfileComparison = lazy(() =>
  import("@/components/ProfileComparison").then((m) => ({ default: m.ProfileComparison }))
);
const SupportChat = lazy(() =>
  import("@/components/SupportChat").then((m) => ({ default: m.SupportChat }))
);
const CurrencyConverter = lazy(() =>
  import("@/components/CurrencyConverter").then((m) => ({ default: m.CurrencyConverter }))
);
const PropAccountLadder = lazy(() =>
  import("@/components/PropAccountLadder").then((m) => ({ default: m.PropAccountLadder }))
);
const QuestsPanel = lazy(() =>
  import("@/components/xp/QuestsPanel").then((m) => ({ default: m.QuestsPanel }))
);
const XpTimeline = lazy(() =>
  import("@/components/xp/XpTimeline").then((m) => ({ default: m.XpTimeline }))
);
const QuestClaimHistory = lazy(() =>
  import("@/components/xp/QuestClaimHistory").then((m) => ({ default: m.QuestClaimHistory }))
);


export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<AwardedAchievement | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [userStats, setUserStats] = useState({ totalXP: 0, totalAchievements: 0, rareAchievements: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();
  const cancelledRef = useRef(true);
  const reduceMotion = usePrefersReducedMotion();
  useRealtimeNotifications(user?.id ?? null);

  // Verify a returning Paystack checkout (?paystack=1&reference=...)
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("reference") || url.searchParams.get("trxref");
    if (!url.searchParams.get("paystack") || !ref) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference: ref },
      });
      if (!error && data?.verified) {
        toast({ title: "Payment confirmed", description: "Your account is activated." });
      } else {
        toast({ title: "Payment not verified", description: data?.message || error?.message || "Try again", variant: "destructive" });
      }
      url.searchParams.delete("paystack");
      url.searchParams.delete("reference");
      url.searchParams.delete("trxref");
      window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : ""));
    })();
  }, [toast]);

  // Load user stats for comparison
  const loadUserStats = async (userId: string, xpPoints?: number) => {
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
        totalXP: xpPoints ?? profile?.xp_points ?? 0,
        totalAchievements,
        rareAchievements,
      });
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

  useEffect(() => {
    if (profile) {
      void loadUserStats(profile.id, profile.xp_points);
    }
  }, [profile?.id]);

  useEffect(() => {
    cancelledRef.current = false;

    let lastLoadedUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelledRef.current) return;
      if (!session) {
        navigate("/");
      } else {
        // Skip duplicate loads — the initial getSession below already
        // kicks this off; INITIAL_SESSION fires again on mount.
        if (lastLoadedUserId === session.user.id) return;
        lastLoadedUserId = session.user.id;
        setUser(session.user);
        void loadProfile(session.user.id);
      }
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelledRef.current) return;
      if (!session) {
        navigate("/");
        return;
      }
      if (lastLoadedUserId === session.user.id) return;
      lastLoadedUserId = session.user.id;
      setUser(session.user);
      await loadProfile(session.user.id);
    })();

    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      // COMPULSORY PAYMENT CHECK — redirect to home if not paid
      if (!data?.payment_completed) {
        toast({
          variant: "destructive",
          title: "Payment Required",
          description: "You must complete payment to access the dashboard.",
        });
        navigate("/");
        return;
      }

      setProfile(data);

      // Check for level and XP achievements. Fire-and-forget: these are
      // notification side-effects, not needed for first paint. Running
      // them serially before setLoading(false) was delaying the spinner.
      if (data) {
        void (async () => {
          try {
            const [levelAchievements, xpAchievements] = await Promise.all([
              checkAndAwardAchievements({
                user_id: userId,
                event_type: 'level_reach',
                event_data: {
                  level: data.rank_level || 1,
                  xp_total: data.xp_points || 0
                }
              }),
              checkAndAwardAchievements({
                user_id: userId,
                event_type: 'xp_total',
                event_data: {
                  xp_total: data.xp_points || 0
                }
              }),
            ]);

            const awarded = levelAchievements[0] ?? xpAchievements[0];
            if (awarded && !cancelledRef.current) {
              setNotification(awarded);
            }
          } catch (error) {
            console.error("Error checking achievements:", error);
          }
        })();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: error.message,
      });
    } finally {
      if (!cancelledRef.current) setLoading(false);
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
    <div className="min-h-screen bg-background rebrand-dashboard">
      {/* Session Lock */}
      <SessionLockScreen timeoutMinutes={5} />

      {/* Security Panel (on-demand, split chunk) */}
      <Suspense fallback={null}>
        <SecurityPanel
          userId={user?.id}
          userEmail={user?.email}
          isOpen={showSecurityPanel}
          onClose={() => setShowSecurityPanel(false)}
        />
      </Suspense>

      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Achievement notification */}
      <AchievementNotification
        achievement={notification}
        onClose={() => setNotification(null)}
      />

      {/* Aurora canvas — replaces the flat radial */}
      <div className="frost-aurora" />

      {/* Floating Navigation */}
      <FloatingNav />

      {/* Main content */}
      <div className="relative max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Editorial greeting + floating utility cluster */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/50">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-white truncate">
              {profile?.display_name ? `Hello, ${profile.display_name.split(" ")[0]}` : "Welcome back"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {user && <NotificationCenter userId={user.id} />}
            <button
              onClick={() => setShowSecurityPanel(true)}
              className="frost-fab"
              aria-label="Security"
              title="Security"
            >
              <Fingerprint className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowComparison(true)}
              className="frost-fab"
              aria-label="Compare"
              title="Compare"
            >
              <GitCompare className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate("/leaderboard")}
              className="frost-fab"
              aria-label="Leaderboard"
              title="Leaderboard"
            >
              <Trophy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KYC verification banner — soft gate */}
        {user && (
          <div className="mb-4">
            <KycStatusBanner userId={user.id} />
          </div>
        )}

        {/* Crypto-wallet hero (rebrand ref IMG_0320) */}
        <WalletHero userId={profile.id} displayName={profile.display_name} avatarUrl={profile.avatar_url} />

        {/* Profile Comparison Modal */}
        {showComparison && profile && (
          <Suspense fallback={null}>
            <ProfileComparison
              currentProfile={profile}
              currentStats={userStats}
              onClose={() => setShowComparison(false)}
            />
          </Suspense>
        )}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6"
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
          <div className="lg:col-span-6 space-y-3 sm:space-y-6 order-3 lg:order-2">
            <XPReactor profile={profile} />
            <Suspense fallback={null}>
              <QuestsPanel userId={profile.id} />
              <XpTimeline userId={profile.id} />
              <QuestClaimHistory userId={profile.id} />
            </Suspense>
            <ActivityFeed userId={profile.id} />

          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-6 order-2 lg:order-3">
            <StreakTracker userId={profile.id} />
            <FriendActivityFeed userId={profile.id} maxItems={10} />
            <WalletSnapshot userId={profile.id} />
            <BtaxWalletOverview userId={profile.id} />
            <PaymentHistoryPanel userId={profile.id} />
            <Suspense fallback={null}>
              <PropAccountLadder userId={profile.id} />
              <CurrencyConverter compact />
            </Suspense>
            
            {/* Support Chat */}
            {user && (
              <div className="rounded-xl border border-border bg-card/50 p-3">
                <Suspense fallback={null}>
                  <SupportChat userId={user.id} />
                </Suspense>
              </div>
            )}
            
            {/* Quick Access to Hub */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={() => navigate("/achievements/hub")}
                className="w-full h-8 text-xs"
                size="sm"
              >
                <Trophy className="mr-1.5 h-3.5 w-3.5" />
                Achievement Hub
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
