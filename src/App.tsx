import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";

const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AchievementHub = lazy(() => import("./pages/AchievementHub"));
const BlackBoard = lazy(() => import("./pages/BlackBoard"));
const BlackVault = lazy(() => import("./pages/BlackVault"));
const BlackVerse = lazy(() => import("./pages/BlackVerse"));
const BlackPass = lazy(() => import("./pages/BlackPass"));
const BlackForge = lazy(() => import("./pages/BlackForge"));
const BlackCoin = lazy(() => import("./pages/BlackCoin"));
const BlackNotify = lazy(() => import("./pages/BlackNotify"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const Discover = lazy(() => import("./pages/Discover"));
const Friends = lazy(() => import("./pages/Friends"));
const BlackArena = lazy(() => import("./pages/BlackArena"));
const BlackArenaPlus = lazy(() => import("./pages/BlackArenaPlus"));
const GlobeEmbed = lazy(() => import("./pages/GlobeEmbed"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminSignup = lazy(() => import("./pages/AdminSignup"));
const Community = lazy(() => import("./pages/Community"));
const CinematicCore = lazy(() => import("./pages/CinematicCore"));
const CinematicAccess = lazy(() => import("./pages/CinematicAccess"));
const PropDashboard = lazy(() => import("./pages/PropDashboard"));
const MyAccounts = lazy(() => import("./pages/MyAccounts"));
const MarketHub = lazy(() => import("./pages/MarketHub"));
const Referrals = lazy(() => import("./pages/Referrals"));
const TradeAnalytics = lazy(() => import("./pages/TradeAnalytics"));
const WorldMap = lazy(() => import("./pages/WorldMap"));
const Atlas = lazy(() => import("./pages/Atlas"));
const ForexTools = lazy(() => import("./pages/ForexTools"));
const VerifyIdentity = lazy(() => import("./pages/VerifyIdentity"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NairaTopUp = lazy(() => import("./pages/NairaTopUp"));
const A11yChecklist = lazy(() => import("./pages/A11yChecklist"));
const Terms = lazy(() => import("./pages/Terms"));
const Contest = lazy(() => import("./pages/Contest"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Classes = lazy(() => import("./pages/Classes"));

import { AnnouncementPopup } from "./components/AnnouncementPopup";
import { NotificationsProvider } from "./components/NotificationsProvider";
import { GlobalThemeProvider } from "./components/GlobalThemeProvider";
import { PresenceProvider } from "./components/PresenceProvider";
import { EnergyModeProvider } from "./contexts/EnergyModeContext";
import { AccessGrantedSeal } from "./components/AccessGrantedSeal";
import { LevelUpCelebration } from "./components/xp/LevelUpCelebration";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EnergyModeProvider>
          <GlobalThemeProvider />
          <PresenceProvider />
          <NotificationsProvider />
          <AnnouncementPopup />
          <AccessGrantedSeal />
          <LevelUpCelebration />

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
        </EnergyModeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
