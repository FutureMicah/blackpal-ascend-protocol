import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Search, TrendingUp, Award, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ProfileComparisonProps {
  currentProfile: any;
  currentStats: {
    totalXP: number;
    totalAchievements: number;
    rareAchievements: number;
  };
  onClose: () => void;
}

export function ProfileComparison({ currentProfile, currentStats, onClose }: ProfileComparisonProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendStats, setFriendStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get accepted friend connections
      const { data: connections } = await supabase
        .from("friend_connections")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (!connections || connections.length === 0) return;

      const friendIds = connections.map((c) => c.friend_id);

      // Get friend profiles
      const { data: friendProfiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);

      setFriends(friendProfiles || []);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const loadFriendStats = async (friendId: string) => {
    setLoading(true);
    try {
      // Get friend achievements
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity,
            description
          )
        `)
        .eq("user_id", friendId);

      const achievements = achievementsData?.map((ua: any) => ua.achievements).filter(Boolean) || [];
      
      const totalAchievements = achievements.length;
      const rareAchievements = achievements.filter(
        (a: any) => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary"
      ).length;

      setFriendStats({
        totalXP: selectedFriend.xp_points || 0,
        totalAchievements,
        rareAchievements,
        streakDays: selectedFriend.streak_days || 0,
        rankLevel: selectedFriend.rank_level || 1,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load friend stats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = async (friend: any) => {
    setSelectedFriend(friend);
    await loadFriendStats(friend.id);
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getComparisonPercentage = (yourValue: number, theirValue: number) => {
    if (theirValue === 0) return 100;
    return Math.round((yourValue / theirValue) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-6xl max-h-[90vh] overflow-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-foreground">Compare Profiles</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Friend Selection */}
          <Card className="glass-card lg:col-span-1">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-auto">
                {filteredFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No friends found. Add friends to compare profiles.
                  </p>
                ) : (
                  filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectFriend(friend)}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        selectedFriend?.id === friend.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>
                            {friend.display_name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{friend.display_name}</p>
                          {friend.username && (
                            <p className="text-sm text-muted-foreground truncate">
                              @{friend.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comparison View */}
          <div className="lg:col-span-2">
            {!selectedFriend ? (
              <Card className="glass-card h-full flex items-center justify-center">
                <CardContent className="text-center p-12">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Select a Friend</h3>
                  <p className="text-muted-foreground">
                    Choose a friend from the list to compare your stats and achievements
                  </p>
                </CardContent>
              </Card>
            ) : loading ? (
              <Card className="glass-card h-full flex items-center justify-center">
                <CardContent className="text-center p-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading comparison...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Profile Headers */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-primary/30">
                        <AvatarImage src={currentProfile.avatar_url} />
                        <AvatarFallback className="text-xl">
                          {currentProfile.display_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-lg">{currentProfile.display_name}</h3>
                      <Badge className="mt-2">You</Badge>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardContent className="p-4 text-center">
                      <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-accent/30">
                        <AvatarImage src={selectedFriend.avatar_url} />
                        <AvatarFallback className="text-xl">
                          {selectedFriend.display_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-bold text-lg">{selectedFriend.display_name}</h3>
                      <Badge variant="outline" className="mt-2">Friend</Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Stats Comparison */}
                <Card className="glass-card">
                  <CardContent className="p-6 space-y-6">
                    <ComparisonStat
                      label="Total XP"
                      icon={<Zap className="w-5 h-5" />}
                      yourValue={currentStats.totalXP}
                      theirValue={friendStats?.totalXP || 0}
                    />
                    <ComparisonStat
                      label="Achievements"
                      icon={<Award className="w-5 h-5" />}
                      yourValue={currentStats.totalAchievements}
                      theirValue={friendStats?.totalAchievements || 0}
                    />
                    <ComparisonStat
                      label="Rare Achievements"
                      icon={<Award className="w-5 h-5 text-purple-500" />}
                      yourValue={currentStats.rareAchievements}
                      theirValue={friendStats?.rareAchievements || 0}
                    />
                    <ComparisonStat
                      label="Day Streak"
                      icon={<TrendingUp className="w-5 h-5" />}
                      yourValue={currentProfile.streak_days || 0}
                      theirValue={friendStats?.streakDays || 0}
                    />
                    <ComparisonStat
                      label="Rank Level"
                      icon={<Badge className="w-5 h-5" />}
                      yourValue={currentProfile.rank_level || 1}
                      theirValue={friendStats?.rankLevel || 1}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ComparisonStat({
  label,
  icon,
  yourValue,
  theirValue,
}: {
  label: string;
  icon: React.ReactNode;
  yourValue: number;
  theirValue: number;
}) {
  const total = yourValue + theirValue;
  const yourPercentage = total === 0 ? 50 : (yourValue / total) * 100;
  const theirPercentage = 100 - yourPercentage;
  const youAhead = yourValue > theirValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold">{label}</span>
        </div>
        {youAhead ? (
          <Badge variant="default" className="text-xs">+{yourValue - theirValue}</Badge>
        ) : yourValue < theirValue ? (
          <Badge variant="outline" className="text-xs">-{theirValue - yourValue}</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">Tied</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className={youAhead ? "font-bold text-primary" : ""}>
          You: {yourValue}
        </div>
        <div className={!youAhead && theirValue > yourValue ? "font-bold text-accent" : ""}>
          Them: {theirValue}
        </div>
      </div>

      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${yourPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute right-0 top-0 h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${theirPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
