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

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackVerse</h1>
            <Crown className="w-8 h-8 text-gold" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with elite traders, share insights, and grow together
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post Card */}
            <Card className="glass-card p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 ring-2 ring-primary/50">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">You</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Input
                    placeholder="Share your trading insight or update..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="mb-3"
                    onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handlePost}
                      disabled={posting || !newPost.trim()}
                      className="bg-primary"
                    >
                      {posting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Posts Feed */}
            {posts.length === 0 ? (
              <Card className="glass-card p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something!</p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="glass-card p-6 hover:border-primary/40 transition-all">
                  <div className="flex items-start gap-4">
                    <Avatar 
                      className="w-12 h-12 ring-2 ring-primary/50 cursor-pointer"
                      onClick={() => navigate(`/profile/${post.user_id}`)}
                    >
                      <AvatarImage src={post.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                        {post.profile?.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 
                          className="font-semibold text-foreground cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/profile/${post.user_id}`)}
                        >
                          {post.profile?.display_name || "Unknown User"}
                        </h3>
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                          Lvl {post.profile?.rank_level || 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(post.created_at), "MMM d 'at' h:mm a")}
                        </span>
                      </div>
                      <p className="text-foreground/90 mb-4">{getActivityContent(post)}</p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors">
                          <Heart className="w-4 h-4" />
                          Like
                        </button>
                        <button className="flex items-center gap-2 hover:text-primary transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          Comment
                        </button>
                        <button className="flex items-center gap-2 hover:text-primary transition-colors">
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Traders */}
            <Card className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-gold" />
                <h2 className="text-xl font-bold gradient-text-cyber">Top Traders</h2>
              </div>
              <div className="space-y-4">
                {topTraders.map((trader, idx) => {
                  const tierBadge = getTierBadge(trader.payment_tier);
                  return (
                    <div 
                      key={trader.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/profile/${trader.id}`)}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10 ring-2 ring-gold/50">
                          <AvatarImage src={trader.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-gold to-primary text-white font-bold">
                            {trader.display_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {idx === 0 && <Crown className="w-4 h-4 text-gold absolute -top-1 -right-1" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">#{idx + 1}</span>
                          <span className="text-foreground font-medium">{trader.display_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${tierBadge.color}`}>
                            {tierBadge.label}
                          </Badge>
                          <span className="text-xs text-primary font-bold">
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
                className="w-full mt-4"
                onClick={() => navigate("/leaderboard")}
              >
                View Full Leaderboard
              </Button>
            </Card>

            {/* Community Stats */}
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold gradient-text-cyber mb-6">Community Pulse</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Members</span>
                  </div>
                  <span className="font-bold text-foreground">{communityStats.users.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Posts</span>
                  </div>
                  <span className="font-bold text-foreground">{communityStats.posts.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Discover Button */}
            <Button 
              className="w-full h-14 text-lg"
              onClick={() => navigate("/discover")}
            >
              <Users className="w-5 h-5 mr-2" />
              Discover Traders
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackVerse;