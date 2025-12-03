import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Achievements from "./pages/Achievements";
import AchievementStats from "./pages/AchievementStats";
import Leaderboard from "./pages/Leaderboard";
import AchievementPathsPage from "./pages/AchievementPathsPage";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/achievements/stats" element={<AchievementStats />} />
          <Route path="/achievements/paths" element={<AchievementPathsPage />} />
          <Route path="/achievements/hub" element={<AchievementHub />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/blackboard" element={<BlackBoard />} />
          <Route path="/blackvault" element={<BlackVault />} />
          <Route path="/blackverse" element={<BlackVerse />} />
          <Route path="/blackpass" element={<BlackPass />} />
          <Route path="/blackforge" element={<BlackForge />} />
          <Route path="/blackcoin" element={<BlackCoin />} />
          <Route path="/blacknotify" element={<BlackNotify />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
