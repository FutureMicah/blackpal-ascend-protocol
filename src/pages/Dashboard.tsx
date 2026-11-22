import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trophy, GitCompare, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/FloatingNav";
import { ProfileHeroCard } from "@/components/dashboard/ProfileHeroCard";
import { XPReactor } from "@/components/dashboard/XPReactor";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<AwardedAchievement | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [userStats, setUserStats] = useState({ totalXP: 0, totalAchievements: 0, rareAchievements: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();
  const achievementsChecked = useRef(false);
  useRealtimeNotifications(user?.id ?? null);

  // Paystack return handler (once)
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
        toast({
          title: "Payment not verified",
          description: data?.message || error?.message || "Try again",
          variant: "destructive",
        });
      }
      url.searchParams.delete("paystack");
      url.searchParams.delete("reference");
      url.searchParams.delete("trxref");
      window.history.replaceState({}, "", url.pathname + (url.search ? `?${url.searchParams}` : ""));
    })();
  }, [toast]);

  const loadProfile = useCallback(
    async (userId: string, opts?: { silent?: boolean }) => {
      try {
        setLoadError(null);
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

        if (error) throw error;
        if (!data) throw new Error("Profile row missing");

        if (!data.payment_completed) {
          toast({
            variant: "destructive",
            title: "Payment Required",
            description: "You must complete payment to access the dashboard.",
          });
          navigate("/");
          return;
        }

        setProfile(data);

        // Award checks only once per session — fired in parallel so the
        // spinner does not wait on two serial edge-function round trips.
        // They are fire-and-forget: failures never block profile display.
        if (!achievementsChecked.current) {
          achievementsChecked.current = true;
          (async () => {
            try {
              const [levelAchievements, xpAchievements] = await Promise.all([
                checkAndAwardAchievements({
                  user_id: userId,
                  event_type: "level_reach",
                  event_data: {
                    level: data.rank_level || 1,
                    xp_total: data.xp_points || 0,
                  },
                }),
                checkAndAwardAchievements({
                  user_id: userId,
                  event_type: "xp_total",
                  event_data: { xp_total: data.xp_points || 0 },
                }),
              ]);
              const awarded = levelAchievements.length > 0 ? levelAchievements[0] : xpAchievements[0];
              if (awarded) setNotification(awarded);
            } catch {
              /* non-blocking */
            }
          })();
        }
      } catch (error: any) {
        console.error("loadProfile", error);
        setLoadError(error?.message || "Failed to load profile");
        if (!opts?.silent) {
          toast({
            variant: "destructive",
            title: "Error loading profile",
            description: error?.message || "Please refresh",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [navigate, toast, checkAndAwardAchievements]
  );

  useEffect(() => {
    let cancelled = false;
    let lastLoadedUserId: string | null = null;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        navigate("/");
        return;
      }

      lastLoadedUserId = session.user.id;
      setUser(session.user);
      await loadProfile(session.user.id);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only react to real sign-in/out — ignore TOKEN_REFRESHED (causes reload loops)
      if (event === "SIGNED_OUT" || !session) {
        navigate("/");
        return;
      }
      if (event === "SIGNED_IN") {
        // Single-flight: getSession already loaded this user on mount;
        // skip the duplicate profile fetch from the listener.
        if (session.user.id === lastLoadedUserId) return;
        lastLoadedUserId = session.user.id;
        setUser(session.user);
        loadProfile(session.user.id, { silent: true });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, loadProfile]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: achievementsData } = await supabase
          .from("user_achievements")
          .select("achievement_id, achievements (id, rarity)")
          .eq("user_id", profile.id);

        if (cancelled) return;
        const achievements = achievementsData?.map((ua: any) => ua.achievements).filter(Boolean) || [];
        setUserStats({
          totalXP: profile.xp_points || 0,
          totalAchievements: achievements.length,
          rareAchievements: achievements.filter(
            (a: any) => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary"
          ).length,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.xp_points]);

  const handleStreakUpdate = useCallback((streakDays: number) => {
    setProfile((current: any) => {
      if (!current) return current;
      if (
        current.achievement_streak === streakDays &&
        current.streak_days === streakDays
      ) {
        return current; // no change — skip re-render
      }
      return { ...current, achievement_streak: streakDays, streak_days: streakDays };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm font-semibold text-muted-foreground">
          {loadError || "Profile not found"}
        </p>
        <Button
          size="sm"
          className="text-xs font-bold"
          onClick={() => {
            setLoading(true);
            if (user?.id) loadProfile(user.id);
            else navigate("/");
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background rebrand-dashboard">
      <SessionLockScreen timeoutMinutes={5} />

      <Suspense fallback={null}>
        <SecurityPanel
          userId={user?.id}
          userEmail={user?.email}
          isOpen={showSecurityPanel}
          onClose={() => setShowSecurityPanel(false)}
        />
      </Suspense>

      <OnboardingTour />

      <AchievementNotification achievement={notification} onClose={() => setNotification(null)} />

      <div className="frost-aurora" />
      <FloatingNav />

      <div className="relative max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="flex items-end justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.22em] text-white/50">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <h1 className="text-base sm:text-2xl font-extrabold tracking-tight text-white truncate leading-tight">
              {profile?.display_name
                ? `Hello, ${profile.display_name.split(" ")[0]}`
                : "Welcome back"}
            </h1>
            <p className="text-[10px] sm:text-[11px] font-bold text-cyan-300/80">
              Level {profile.rank_level || 1} · {Number(profile.xp_points || 0).toLocaleString()} XP
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {user && <NotificationCenter userId={user.id} />}
            <button
              onClick={() => setShowSecurityPanel(true)}
              className="frost-fab"
              aria-label="Security"
              title="Security"
            >
              <Fingerprint className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => setShowComparison(true)}
              className="frost-fab"
              aria-label="Compare"
              title="Compare"
            >
              <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => navigate("/leaderboard")}
              className="frost-fab"
              aria-label="Leaderboard"
              title="Leaderboard"
            >
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {user && (
          <div className="mb-3 sm:mb-4">
            <KycStatusBanner userId={user.id} />
          </div>
        )}

        <WalletHero
          userId={profile.id}
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
        />

        {showComparison && profile && (
          <Suspense fallback={null}>
            <ProfileComparison
              currentProfile={profile}
              currentStats={userStats}
              onClose={() => setShowComparison(false)}
            />
          </Suspense>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 mt-3 sm:mt-4">
          <div className="lg:col-span-3 order-1">
            <ProfileHeroCard
              profile={profile}
              user={user}
              onProfileUpdate={() => user?.id && loadProfile(user.id, { silent: true })}
            />
          </div>

          <div className="lg:col-span-6 space-y-3 sm:space-y-6 order-3 lg:order-2">
            <XPReactor profile={profile} />
            <Suspense fallback={null}>
              <QuestsPanel userId={profile.id} />
              <XpTimeline userId={profile.id} />
              <QuestClaimHistory userId={profile.id} />
            </Suspense>
            <ActivityFeed userId={profile.id} />
          </div>

          <div className="lg:col-span-3 space-y-3 sm:space-y-6 order-2 lg:order-3">
            <StreakTracker userId={profile.id} onStreakUpdate={handleStreakUpdate} />
            <FriendActivityFeed userId={profile.id} maxItems={10} />
            <WalletSnapshot userId={profile.id} />
            <BtaxWalletOverview userId={profile.id} />
            <PaymentHistoryPanel userId={profile.id} />
            <Suspense fallback={null}>
              <PropAccountLadder userId={profile.id} />
              <CurrencyConverter compact />
            </Suspense>

            {user && (
              <div className="rounded-xl border border-border bg-card/50 p-3">
                <Suspense fallback={null}>
                  <SupportChat userId={user.id} />
                </Suspense>
              </div>
            )}

            <Button
              onClick={() => navigate("/achievements/hub")}
              className="w-full h-8 text-[11px] font-bold"
              size="sm"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Achievement Hub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
