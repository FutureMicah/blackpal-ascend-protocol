import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Award, Crown, Zap, Star, Coins } from "lucide-react";
import { ProfitSharePanel } from "@/components/leaderboard/ProfitSharePanel";
import { useToast } from "@/hooks/use-toast";
import { calculateProfileCompletion } from "@/lib/profile-utils";
import { FloatingNav } from "@/components/FloatingNav";

interface LeaderboardEntry {
  user_id: string; display_name: string; avatar_url: string | null;
  total_achievements: number; xp_points: number; streak_days: number;
  best_achievement_streak: number; rarest_achievement_count: number; rank: number;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [featuredProfiles, setFeaturedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("xp");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setCurrentUserId(user.id);

      const { PUBLIC_PROFILE_FIELDS } = await import("@/lib/profile-fields");
      const { data: profiles, error: profilesError } = await (supabase.from("profiles") as any)
        .select(PUBLIC_PROFILE_FIELDS)
        .order("xp_points", { ascending: false });
      if (profilesError) throw profilesError;

      const featured = profiles?.filter(p => { const c = calculateProfileCompletion(p); return c.isComplete && c.hasCustomTheme; }).slice(0, 3) || [];
      setFeaturedProfiles(featured);

      const { data: achievementCounts } = await supabase.from("user_achievements").select("user_id, achievement_id");
      const { data: achievements } = await supabase.from("achievements").select("id, rarity");

      const countMap = achievementCounts?.reduce((acc, ua) => { acc[ua.user_id] = (acc[ua.user_id] || 0) + 1; return acc; }, {} as Record<string, number>) || {};
      const rarestMap = achievementCounts?.reduce((acc, ua) => { const a = achievements?.find(x => x.id === ua.achievement_id); if (a?.rarity === 'legendary' || a?.rarity === 'mythic') acc[ua.user_id] = (acc[ua.user_id] || 0) + 1; return acc; }, {} as Record<string, number>) || {};

      const entries: LeaderboardEntry[] = profiles?.map((p, i) => ({
        user_id: p.id, display_name: p.display_name, avatar_url: p.avatar_url,
        total_achievements: countMap[p.id] || 0, xp_points: p.xp_points || 0,
        streak_days: p.streak_days || 0, best_achievement_streak: p.best_achievement_streak || 0,
        rarest_achievement_count: rarestMap[p.id] || 0, rank: i + 1,
      })) || [];
      setLeaderboard(entries);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to load leaderboard", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-slate-400" />;
    if (rank === 3) return <Trophy className="h-4 w-4 text-amber-700" />;
    return <span className="text-[10px] font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50";
    if (rank === 2) return "bg-gradient-to-r from-slate-400/20 to-slate-500/20 border-slate-400/50";
    if (rank === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-700/50";
    return "";
  };

  const sortedByTab = (tab: string) => {
    return [...leaderboard].sort((a, b) => {
      if (tab === "xp") return b.xp_points - a.xp_points;
      if (tab === "achievements") return b.total_achievements - a.total_achievements;
      if (tab === "streak") return b.best_achievement_streak - a.best_achievement_streak;
      if (tab === "rarest") return b.rarest_achievement_count - a.rarest_achievement_count;
      return 0;
    }).map((e, i) => ({ ...e, rank: i + 1 }));
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], statKey: keyof LeaderboardEntry, label: string) => (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <motion.div key={entry.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
          <Card className={`${getRankColor(entry.rank)} ${entry.user_id === currentUserId ? "ring-1 ring-primary" : ""}`}>
            <div className="p-2.5 flex items-center gap-2.5">
              <div className="w-7 flex items-center justify-center shrink-0">{getRankIcon(entry.rank)}</div>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{entry.display_name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="text-xs font-bold truncate">{entry.display_name}</h3>
                  {entry.user_id === currentUserId && <Badge variant="secondary" className="text-[7px] px-1 py-0 h-3.5">You</Badge>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-primary">{typeof entry[statKey] === 'number' ? entry[statKey].toLocaleString() : entry[statKey]}</div>
                <div className="text-[8px] text-muted-foreground">{label}</div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  if (loading) {
    return <div className="min-h-screen bg-background p-3"><div className="max-w-3xl mx-auto space-y-3 pt-16"><Skeleton className="h-8 w-48" />{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="h-7 text-xs mb-2 px-2">
            <ArrowLeft className="mr-1 h-3 w-3" /> Back
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Leaderboard
          </h1>
          <p className="text-xs text-muted-foreground">Top achievers ranked by metrics</p>
        </div>

        {/* Featured */}
        {featuredProfiles.length > 0 && (
          <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-current" /> Featured Profiles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="grid grid-cols-3 gap-2">
                {featuredProfiles.map((p, i) => (
                  <Card key={p.id} className="cursor-pointer border-amber-500/30 hover:scale-[1.02] transition-transform" onClick={() => navigate(`/profile/${p.id}`)}>
                    <CardContent className="p-2 text-center">
                      <div className="relative inline-block">
                        <Avatar className="w-10 h-10 border-2 border-amber-500/50">
                          <AvatarImage src={p.avatar_url || undefined} />
                          <AvatarFallback className="text-[9px]">{p.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-[9px] font-bold truncate mt-1">{p.display_name}</h3>
                      <p className="text-[8px] text-muted-foreground">{p.xp_points || 0} XP</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3 h-8">
            <TabsTrigger value="xp" className="text-[10px] gap-1"><Zap className="h-3 w-3" />XP</TabsTrigger>
            <TabsTrigger value="achievements" className="text-[10px] gap-1"><Award className="h-3 w-3" />Badges</TabsTrigger>
            <TabsTrigger value="streak" className="text-[10px] gap-1"><Trophy className="h-3 w-3" />Streak</TabsTrigger>
            <TabsTrigger value="rarest" className="text-[10px] gap-1"><Star className="h-3 w-3" />Rare</TabsTrigger>
          </TabsList>
          <TabsContent value="xp">{renderLeaderboard(sortedByTab("xp"), "xp_points", "XP")}</TabsContent>
          <TabsContent value="achievements">{renderLeaderboard(sortedByTab("achievements"), "total_achievements", "Badges")}</TabsContent>
          <TabsContent value="streak">{renderLeaderboard(sortedByTab("streak"), "best_achievement_streak", "Streak")}</TabsContent>
          <TabsContent value="rarest">{renderLeaderboard(sortedByTab("rarest"), "rarest_achievement_count", "Legendary+")}</TabsContent>
        </Tabs>

        {leaderboard.length === 0 && (
          <Card className="p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="text-sm font-bold mb-1">No Rankings Yet</h3>
            <p className="text-xs text-muted-foreground">Start earning to appear here!</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
