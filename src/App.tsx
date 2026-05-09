import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Achievements from "./pages/Achievements";
import Leaderboard from "./pages/Leaderboard";
import AchievementHub from "./pages/AchievementHub";
import BlackBoard from "./pages/BlackBoard";
import BlackVault from "./pages/BlackVault";
import BlackVerse from "./pages/BlackVerse";
import BlackPass from "./pages/BlackPass";
import BlackForge from "./pages/BlackForge";
import BlackCoin from "./pages/BlackCoin";
import BlackNotify from "./pages/BlackNotify";
import PublicProfile from "./pages/PublicProfile";
import ProfileEdit from "./pages/ProfileEdit";
import Discover from "./pages/Discover";
import Friends from "./pages/Friends";
import BlackArena from "./pages/BlackArena";
import BlackArenaPlus from "./pages/BlackArenaPlus";
import GlobeEmbed from "./pages/GlobeEmbed";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./pages/AdminSignup";
import Community from "./pages/Community";
import CinematicCore from "./pages/CinematicCore";
import CinematicAccess from "./pages/CinematicAccess";
import PropDashboard from "./pages/PropDashboard";
import MyAccounts from "./pages/MyAccounts";
import MarketHub from "./pages/MarketHub";
import Referrals from "./pages/Referrals";
import TradeAnalytics from "./pages/TradeAnalytics";
import WorldMap from "./pages/WorldMap";
import ForexTools from "./pages/ForexTools";
import VerifyIdentity from "./pages/VerifyIdentity";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NairaTopUp from "./pages/NairaTopUp";
import A11yChecklist from "./pages/A11yChecklist";
import Terms from "./pages/Terms";
import Contest from "./pages/Contest";
import ReferralLanding from "./pages/ReferralLanding";
import { AnnouncementPopup } from "./components/AnnouncementPopup";
import { NotificationsProvider } from "./components/NotificationsProvider";
import { GlobalThemeProvider } from "./components/GlobalThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <GlobalThemeProvider />
        <NotificationsProvider />
        <AnnouncementPopup />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/achievements/hub" element={<AchievementHub />} />
          {/* Removed: /achievements/stats and /achievements/paths (mock pages) */}
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
          {/* Admin entry: hidden /admin-login route only — no in-app /admin link */}
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
          {/* Removed: /copy-trading */}
          <Route path="/trade-analytics" element={<TradeAnalytics />} />
          <Route path="/world-map" element={<WorldMap />} />
          <Route path="/forex-tools" element={<ForexTools />} />
          <Route path="/verify-identity" element={<VerifyIdentity />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/wallet/topup" element={<NairaTopUp />} />
          <Route path="/a11y-checklist" element={<A11yChecklist />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
