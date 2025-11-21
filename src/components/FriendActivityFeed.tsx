import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Bell, UserPlus, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FriendActivity {
  id: string;
  friend_name: string;
  friend_avatar: string | null;
  achievement_name: string;
  achievement_icon: string;
  timestamp: string;
}

interface FriendActivityFeedProps {
  userId: string;
}

export const FriendActivityFeed = ({ userId }: FriendActivityFeedProps) => {
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFriendActivities();
    setupRealtimeSubscription();
  }, [userId]);

  const loadFriendActivities = async () => {
    try {
      // Get user's friends
      const { data: friends } = await supabase
        .from("friend_connections")
        .select("friend_id")
        .eq("user_id", userId)
        .eq("status", "accepted");

      if (!friends || friends.length === 0) {
        setLoading(false);
        return;
      }

      const friendIds = friends.map(f => f.friend_id);

      // Get recent achievements from friends
      const { data: recentAchievements, error } = await supabase
        .from("user_achievements")
        .select(`
          id,
          awarded_at,
          achievements (
            name,
            icon
          ),
          profiles (
            display_name,
            avatar_url
          )
        `)
        .in("user_id", friendIds)
        .order("awarded_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedActivities: FriendActivity[] = recentAchievements?.map((ua: any) => ({
        id: ua.id,
        friend_name: ua.profiles?.display_name || "Unknown",
        friend_avatar: ua.profiles?.avatar_url,
        achievement_name: ua.achievements?.name || "Achievement",
        achievement_icon: ua.achievements?.icon || "🏆",
        timestamp: ua.awarded_at,
      })) || [];

      setActivities(formattedActivities);
    } catch (error) {
      console.error("Error loading friend activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('friend-achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
        },
        async (payload) => {
          // Check if this is from a friend
          const { data: isFriend } = await supabase
            .from("friend_connections")
            .select("id")
            .eq("user_id", userId)
            .eq("friend_id", payload.new.user_id)
            .eq("status", "accepted")
            .single();

          if (isFriend) {
            // Fetch achievement and profile details
            const { data: achievement } = await supabase
              .from("achievements")
              .select("name, icon")
              .eq("id", payload.new.achievement_id)
              .single();

            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", payload.new.user_id)
              .single();

            if (achievement && profile) {
              const newActivity: FriendActivity = {
                id: payload.new.id,
                friend_name: profile.display_name,
                friend_avatar: profile.avatar_url,
                achievement_name: achievement.name,
                achievement_icon: achievement.icon,
                timestamp: payload.new.awarded_at,
              };

              setActivities(prev => [newActivity, ...prev].slice(0, 20));

              // Show notification
              toast({
                title: `${profile.display_name} unlocked an achievement!`,
                description: `${achievement.icon} ${achievement.name}`,
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading friend activity...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Friend Activity
        </h3>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {activities.length}
        </Badge>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.friend_avatar || undefined} />
                <AvatarFallback>
                  {activity.friend_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{activity.friend_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-3 w-3" />
                  <span className="truncate">
                    unlocked <span className="font-medium">{activity.achievement_icon} {activity.achievement_name}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activities.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h4 className="font-bold mb-2">No Friend Activity</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add friends to see their achievement unlocks
            </p>
            <Button variant="outline" size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Friends
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
