import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  TrendingUp, 
  Flame, 
  User, 
  CreditCard, 
  Target,
  Bell,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FriendActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data: {
    title?: string;
    description?: string;
    icon?: string;
    xp_earned?: number;
    level?: number;
    streak?: number;
    achievement_name?: string;
    milestone_name?: string;
  };
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    country: string | null;
  };
}

interface FriendActivityFeedProps {
  userId?: string;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  achievement: <Trophy className="h-4 w-4 text-yellow-500" />,
  level_up: <TrendingUp className="h-4 w-4 text-green-500" />,
  streak: <Flame className="h-4 w-4 text-orange-500" />,
  profile_update: <User className="h-4 w-4 text-blue-500" />,
  payment: <CreditCard className="h-4 w-4 text-purple-500" />,
  milestone: <Target className="h-4 w-4 text-pink-500" />,
};

const activityColors: Record<string, string> = {
  achievement: 'bg-yellow-500/10 border-yellow-500/20',
  level_up: 'bg-green-500/10 border-green-500/20',
  streak: 'bg-orange-500/10 border-orange-500/20',
  profile_update: 'bg-blue-500/10 border-blue-500/20',
  payment: 'bg-purple-500/10 border-purple-500/20',
  milestone: 'bg-pink-500/10 border-pink-500/20',
};

export function FriendActivityFeed({ 
  userId, 
  maxItems = 20, 
  showHeader = true,
  className = ''
}: FriendActivityFeedProps) {
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivity, setNewActivity] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadActivities = async () => {
      setLoading(true);
      
      // Get friend IDs first
      const { data: friendConnections } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      const friendIds = friendConnections?.map(fc => 
        fc.user_id === userId ? fc.friend_id : fc.user_id
      ) || [];

      // Include self in feed
      const allUserIds = [userId, ...friendIds];

      if (allUserIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Get activities
      const { data: activitiesData, error } = await supabase
        .from('friend_activities')
        .select('*')
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) {
        console.error('Error loading activities:', error);
        setLoading(false);
        return;
      }

      // Get profiles for all users
      const userIdsInActivities = [...new Set(activitiesData?.map(a => a.user_id) || [])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, country')
        .in('id', userIdsInActivities);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      const enrichedActivities = activitiesData?.map(activity => ({
        ...activity,
        activity_data: activity.activity_data as FriendActivity['activity_data'],
        profile: profileMap.get(activity.user_id) || {
          display_name: 'Unknown User',
          avatar_url: null,
          country: null
        }
      })) || [];

      setActivities(enrichedActivities);
      setLoading(false);
    };

    loadActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('friend-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_activities'
        },
        async (payload) => {
          const newActivityData = payload.new as FriendActivity;
          
          // Fetch profile for new activity
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, country')
            .eq('id', newActivityData.user_id)
            .maybeSingle();

          const enrichedActivity = {
            ...newActivityData,
            activity_data: newActivityData.activity_data as FriendActivity['activity_data'],
            profile: profile || {
              display_name: 'Unknown User',
              avatar_url: null,
              country: null
            }
          };

          setActivities(prev => [enrichedActivity, ...prev.slice(0, maxItems - 1)]);
          setNewActivity(newActivityData.id);
          
          // Clear highlight after animation
          setTimeout(() => setNewActivity(null), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, maxItems]);

  const getActivityMessage = (activity: FriendActivity) => {
    const { activity_type, activity_data } = activity;
    
    switch (activity_type) {
      case 'achievement':
        return `unlocked "${activity_data.achievement_name || 'an achievement'}"`;
      case 'level_up':
        return `reached level ${activity_data.level || '?'}`;
      case 'streak':
        return `is on a ${activity_data.streak || '?'} day streak!`;
      case 'profile_update':
        return 'updated their profile';
      case 'payment':
        return 'completed payment activation';
      case 'milestone':
        return `achieved "${activity_data.milestone_name || 'a milestone'}"`;
      default:
        return activity_data.description || 'did something awesome';
    }
  };

  if (loading) {
    return (
      <Card className={`bg-card/50 backdrop-blur border-border/50 ${className}`}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Friend Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card/50 backdrop-blur border-border/50 ${className}`}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Friend Activity
            {activities.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {activities.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4 pb-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">No activity yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Connect with friends to see their updates
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    backgroundColor: newActivity === activity.id 
                      ? 'hsl(var(--primary) / 0.1)' 
                      : 'transparent'
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    backgroundColor: { duration: 1 }
                  }}
                  className={`flex items-start gap-3 py-3 border-b border-border/30 last:border-0 rounded-lg px-2 ${
                    newActivity === activity.id ? 'ring-1 ring-primary/30' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 ring-2 ring-background">
                    <AvatarImage src={activity.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {activity.profile?.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {activity.profile?.display_name || 'Unknown'}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {getActivityMessage(activity)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                        activityColors[activity.activity_type] || 'bg-muted border-border'
                      }`}>
                        {activityIcons[activity.activity_type] || <Bell className="h-3 w-3" />}
                        <span className="capitalize">{activity.activity_type.replace('_', ' ')}</span>
                      </div>
                      
                      {activity.activity_data.xp_earned && (
                        <Badge variant="outline" className="text-xs">
                          +{activity.activity_data.xp_earned} XP
                        </Badge>
                      )}
                      
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default FriendActivityFeed;
