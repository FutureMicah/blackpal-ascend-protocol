import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, Award, Zap, Globe, Send, Heart, Share2, Crown, Loader2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Post {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data: any;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    rank_level: number;
  };
}

const BlackVerse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [topTraders, setTopTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [communityStats, setCommunityStats] = useState({ users: 0, posts: 0 });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);
      await loadData();
    };
    init();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load community posts (friend activities as posts)
      const { data: activities } = await supabase
        .from("friend_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      // Get profiles for each activity
      if (activities && activities.length > 0) {
        const userIds = [...new Set(activities.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, rank_level")
          .in("id", userIds);

        const postsWithProfiles = activities.map(activity => ({
          ...activity,
          profile: profiles?.find(p => p.id === activity.user_id)
        }));
        setPosts(postsWithProfiles);
      }

      // Load top traders (by XP)
      const { data: traders } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, xp_points, rank_level, payment_tier")
        .order("xp_points", { ascending: false })
        .limit(5);

      setTopTraders(traders || []);

      // Get community stats
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true });

      const { count: postCount } = await supabase
        .from("friend_activities")
        .select("*", { count: 'exact', head: true });

      setCommunityStats({
        users: userCount || 0,
        posts: postCount || 0
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!currentUserId || !newPost.trim()) return;
    
    setPosting(true);
    try {
      const { error } = await supabase
        .from("friend_activities")
        .insert({
          user_id: currentUserId,
          activity_type: "post",
          activity_data: { content: newPost.trim() }
        });

      if (error) throw error;

      setNewPost("");
      toast({ title: "Posted successfully!" });
      await loadData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setPosting(false);
    }
  };

  const getActivityContent = (post: Post) => {
    switch (post.activity_type) {
      case 'post':
        return post.activity_data?.content || "Shared an update";
      case 'achievement':
        return `Unlocked achievement: ${post.activity_data?.achievementName || 'New badge'}`;
      case 'level_up':
        return `Reached level ${post.activity_data?.level || '?'}!`;
      case 'streak':
        return `Achieved a ${post.activity_data?.days || '?'} day streak!`;
      case 'friend_request':
        return "Made a new connection";
      default:
        return "Shared an activity";
    }
  };

  const getTierBadge = (tier: string | null) => {
    switch (tier) {
      case 'NIGERIA': return { label: 'Gold', color: 'bg-yellow-500/20 text-yellow-500' };
      case 'AFRICA': return { label: 'Platinum', color: 'bg-gray-400/20 text-gray-300' };
      case 'INTERNATIONAL': return { label: 'Diamond', color: 'bg-cyan-400/20 text-cyan-400' };
      default: return { label: 'Member', color: 'bg-primary/20 text-primary' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <FloatingNav />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 pt-20 sm:pt-24">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text-cyber">BlackVerse</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Connect with elite traders, share insights, and grow together
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Create Post */}
            <Card className="glass-card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-primary/50 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs">You</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Share your trading insight..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="mb-2 text-sm h-9"
                    onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      onClick={handlePost}
                      disabled={posting || !newPost.trim()}
                    >
                      {posting ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Send className="w-3 h-3 mr-1" />
                      )}
                      <span className="text-xs">Post</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Posts Feed */}
            {posts.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-sm font-bold mb-1">No posts yet</h3>
                <p className="text-xs text-muted-foreground">Be the first to share something!</p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="glass-card p-3 sm:p-4 hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-3">
                    <Avatar 
                      className="w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-primary/50 cursor-pointer shrink-0"
                      onClick={() => navigate(`/profile/${post.user_id}`)}
                    >
                      <AvatarImage src={post.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xs">
                        {post.profile?.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span 
                          className="font-semibold text-xs sm:text-sm text-foreground cursor-pointer hover:text-primary truncate max-w-[120px] sm:max-w-[180px]"
                          onClick={() => navigate(`/profile/${post.user_id}`)}
                        >
                          {post.profile?.display_name || "Unknown"}
                        </span>
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">
                          Lvl {post.profile?.rank_level || 1}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {format(new Date(post.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/90 mb-3 break-words">{getActivityContent(post)}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <button className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Heart className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Like</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-primary transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Comment</span>
                        </button>
                        <button className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Top Traders */}
            <Card className="glass-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Top Traders</h2>
              </div>
              <div className="space-y-2">
                {topTraders.map((trader, idx) => {
                  const tierBadge = getTierBadge(trader.payment_tier);
                  return (
                    <div 
                      key={trader.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/profile/${trader.id}`)}
                    >
                      <Avatar className="w-7 h-7 ring-1 ring-primary/30 shrink-0">
                        <AvatarImage src={trader.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-[10px]">
                          {trader.display_name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-[10px] text-muted-foreground">#{idx + 1}</span>
                          <span className="text-xs font-medium text-foreground truncate">{trader.display_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${tierBadge.color}`}>
                            {tierBadge.label}
                          </Badge>
                          <span className="text-[10px] text-primary font-bold">
                            {trader.xp_points?.toLocaleString() || 0} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full mt-3 text-xs h-8"
                onClick={() => navigate("/leaderboard")}
              >
                View Leaderboard
              </Button>
            </Card>

            {/* Community Stats */}
            <Card className="glass-card p-3 sm:p-4">
              <h2 className="text-sm font-bold text-foreground mb-3">Community Pulse</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-background/30">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Members</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{communityStats.users.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background/30">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Posts</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{communityStats.posts.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Discover */}
            <Button 
              className="w-full h-9 text-xs"
              onClick={() => navigate("/discover")}
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Discover Traders
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackVerse;