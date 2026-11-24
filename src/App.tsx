import { Component, lazy, Suspense, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
const lazyWithRetry = (importer: () => Promise<{ default: ComponentType<any> }>) =>
  lazy(async () => {
    try {
      return await importer();
    } catch {
      // Transient module fetch failures can happen during deploys or on mobile
      // connections. Retry before allowing React to surface the error.
      await new Promise((resolve) => setTimeout(resolve, 250));
      return importer();
    }
  });

const Index = lazyWithRetry(() => import("./pages/Index"));

const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Achievements = lazyWithRetry(() => import("./pages/Achievements"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const AchievementHub = lazyWithRetry(() => import("./pages/AchievementHub"));
const BlackBoard = lazyWithRetry(() => import("./pages/BlackBoard"));
const BlackVault = lazyWithRetry(() => import("./pages/BlackVault"));
const BlackVerse = lazyWithRetry(() => import("./pages/BlackVerse"));
const BlackPass = lazyWithRetry(() => import("./pages/BlackPass"));
const BlackForge = lazyWithRetry(() => import("./pages/BlackForge"));
const BlackCoin = lazyWithRetry(() => import("./pages/BlackCoin"));
const BlackNotify = lazyWithRetry(() => import("./pages/BlackNotify"));
const PublicProfile = lazyWithRetry(() => import("./pages/PublicProfile"));
const ProfileEdit = lazyWithRetry(() => import("./pages/ProfileEdit"));
const Discover = lazyWithRetry(() => import("./pages/Discover"));
const Friends = lazyWithRetry(() => import("./pages/Friends"));
const BlackArena = lazyWithRetry(() => import("./pages/BlackArena"));
const BlackArenaPlus = lazyWithRetry(() => import("./pages/BlackArenaPlus"));
const GlobeEmbed = lazyWithRetry(() => import("./pages/GlobeEmbed"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminSignup = lazyWithRetry(() => import("./pages/AdminSignup"));
const Community = lazyWithRetry(() => import("./pages/Community"));
const CinematicCore = lazyWithRetry(() => import("./pages/CinematicCore"));
const CinematicAccess = lazyWithRetry(() => import("./pages/CinematicAccess"));
const PropDashboard = lazyWithRetry(() => import("./pages/PropDashboard"));
const MyAccounts = lazyWithRetry(() => import("./pages/MyAccounts"));
const MarketHub = lazyWithRetry(() => import("./pages/MarketHub"));
const Referrals = lazyWithRetry(() => import("./pages/Referrals"));
const TradeAnalytics = lazyWithRetry(() => import("./pages/TradeAnalytics"));
const WorldMap = lazyWithRetry(() => import("./pages/WorldMap"));
const Atlas = lazyWithRetry(() => import("./pages/Atlas"));
const ForexTools = lazyWithRetry(() => import("./pages/ForexTools"));
const VerifyIdentity = lazyWithRetry(() => import("./pages/VerifyIdentity"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const NairaTopUp = lazyWithRetry(() => import("./pages/NairaTopUp"));
const A11yChecklist = lazyWithRetry(() => import("./pages/A11yChecklist"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Contest = lazyWithRetry(() => import("./pages/Contest"));
const ReferralLanding = lazyWithRetry(() => import("./pages/ReferralLanding"));
const Marketplace = lazyWithRetry(() => import("./pages/Marketplace"));
const Classes = lazyWithRetry(() => import("./pages/Classes"));

// Non-critical global overlays are deferred so framer-motion + dialog code
// stay out of the first-load bundle on 4G. Each renders nothing until loaded.
const AnnouncementPopup = lazyWithRetry(() => import("./components/AnnouncementPopup").then(m => ({ default: m.AnnouncementPopup })));
const AccessGrantedSeal = lazyWithRetry(() => import("./components/AccessGrantedSeal").then(m => ({ default: m.AccessGrantedSeal })));
const LevelUpCelebration = lazyWithRetry(() => import("./components/xp/LevelUpCelebration").then(m => ({ default: m.LevelUpCelebration })));
const NotificationsProvider = lazyWithRetry(() => import("./components/NotificationsProvider").then(m => ({ default: m.NotificationsProvider })));

import { GlobalThemeProvider } from "./components/GlobalThemeProvider";
import { PresenceProvider } from "./components/PresenceProvider";
import { EnergyModeProvider } from "./contexts/EnergyModeContext";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

class ModuleLoadBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; resetKey?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("A page module failed to load", error, info.componentStack);
  }

  componentDidUpdate(previousProps: Readonly<{ children: ReactNode; fallback: ReactNode; resetKey?: string }>) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const ModuleLoadFallback = () => (
  <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
    <p className="text-sm font-semibold text-foreground">This page couldn’t load.</p>
    <Button onClick={() => window.location.reload()}>Try again</Button>
  </div>
);

const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <ModuleLoadBoundary resetKey={location.pathname} fallback={<ModuleLoadFallback />}>
      {children}
    </ModuleLoadBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EnergyModeProvider>
          <GlobalThemeProvider />
          <PresenceProvider />
          <ModuleLoadBoundary fallback={null}>
            <Suspense fallback={null}>
              <NotificationsProvider />
              <AnnouncementPopup />
              <AccessGrantedSeal />
              <LevelUpCelebration />
            </Suspense>
          </ModuleLoadBoundary>

          <RouteErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/achievements/hub" element={<AchievementHub />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/blackboard" element={<BlackBoard />} />
              <Route path="/blackvault" element={<BlackVault />} />
              <Route path="/blackverse" element={<BlackVerse />} />
              <Route path="/blackpass" element={<BlackPass />} />
              <Route path="/blackforge" element={<BlackForge />} />
              <Route path="/btax" element={<BlackCoin />} />
              <Route path="/blackcoin" element={<Navigate to="/btax" replace />} />
              <Route path="/blacknotify" element={<BlackNotify />} />
              <Route path="/blackarena" element={<BlackArena />} />
              <Route path="/blackarena/pro" element={<BlackArenaPlus />} />
              <Route path="/globe" element={<GlobeEmbed />} />
              <Route path="/profile/:userId" element={<PublicProfile />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/admin-login" element={<AdminLogin />} />
              <Route path="/admin-signup" element={<AdminSignup />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/community" element={<Community />} />
              <Route path="/cinematic-core" element={<CinematicCore />} />
              <Route path="/cinematic-access" element={<CinematicAccess />} />
              <Route path="/prop-dashboard" element={<PropDashboard />} />
              <Route path="/my-accounts" element={<MyAccounts />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/market-hub" element={<MarketHub />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/r/:code" element={<ReferralLanding />} />
              <Route path="/contest" element={<Contest />} />
              <Route path="/trade-analytics" element={<TradeAnalytics />} />
              <Route path="/world-map" element={<WorldMap />} />
              <Route path="/atlas" element={<Atlas />} />
              <Route path="/forex-tools" element={<ForexTools />} />
              <Route path="/verify-identity" element={<VerifyIdentity />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/wallet/topup" element={<NairaTopUp />} />
              <Route path="/a11y-checklist" element={<A11yChecklist />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </EnergyModeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
