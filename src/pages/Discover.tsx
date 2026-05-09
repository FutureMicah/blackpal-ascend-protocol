import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, UserPlus, Check, Clock, X, Globe, Trophy, Zap, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
  xp_points: number | null;
  rank_level: number | null;
  bio: string | null;
  connectionStatus?: 'none' | 'pending' | 'accepted' | 'sent';
  connectionId?: string;
}

const Discover = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUserId(user.id);
      await Promise.all([loadUsers(user.id), loadPendingRequests(user.id)]);
    };
    init();
  }, [navigate]);

  const loadUsers = async (userId: string) => {
    setLoading(true);
    try {
      // Get all users except current user
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, country, xp_points, rank_level, bio")
        .neq("id", userId)
        .order("xp_points", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get existing connections
      const { data: connections } = await supabase
        .from("friend_connections")
        .select("*")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      // Map connection status + connection id to each user
      const usersWithStatus = (profiles || []).map(profile => {
        const connection = connections?.find(
          c => (c.user_id === profile.id || c.friend_id === profile.id)
        );

        let connectionStatus: 'none' | 'pending' | 'accepted' | 'sent' = 'none';
        let connectionId: string | undefined;
        if (connection) {
          connectionId = connection.id;
          if (connection.status === 'accepted') {
            connectionStatus = 'accepted';
          } else if (connection.status === 'pending') {
            connectionStatus = connection.user_id === userId ? 'sent' : 'pending';
          }
        }

        return { ...profile, connectionStatus, connectionId };
      });

      setUsers(usersWithStatus);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading users",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async (userId: string) => {
    const { data } = await supabase
      .from("friend_connections")
      .select(`
        *,
        profiles!friend_connections_user_id_fkey(id, display_name, avatar_url, country)
      `)
      .eq("friend_id", userId)
      .eq("status", "pending");

    setPendingRequests(data || []);
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!currentUserId) return;
    setSendingRequest(friendId);
    
    try {
      const { error } = await supabase
        .from("friend_connections")
        .insert({
          user_id: currentUserId,
          friend_id: friendId,
          status: "pending"
        });

      if (error) throw error;

      // Post activity
      await supabase.from("friend_activities").insert({
        user_id: currentUserId,
        activity_type: "friend_request",
        activity_data: { friend_id: friendId }
      });

      toast({
        title: "Request sent!",
        description: "Friend request has been sent successfully.",
      });

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === friendId ? { ...u, connectionStatus: 'sent' as const } : u
      ));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleRequest = async (requestId: string, accept: boolean) => {
    try {
      if (accept) {
        await supabase
          .from("friend_connections")
          .update({ status: "accepted" })
          .eq("id", requestId);
        
        toast({ title: "Friend request accepted!" });
      } else {
        await supabase
          .from("friend_connections")
          .delete()
          .eq("id", requestId);
        
        toast({ title: "Friend request declined" });
      }
      
      // Reload data
      if (currentUserId) {
        await Promise.all([loadUsers(currentUserId), loadPendingRequests(currentUserId)]);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = countryFilter === "all" || user.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  const uniqueCountries = [...new Set(users.map(u => u.country).filter(Boolean))];

  const getConnectionButton = (user: UserProfile) => {
    if (sendingRequest === user.id) {
      return (
        <Button size="sm" disabled>
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      );
    }
    
    switch (user.connectionStatus) {
      case 'accepted':
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            Friends
          </Badge>
        );
      case 'sent':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {}}>
              Accept
            </Button>
          </div>
        );
      default:
        return (
          <Button 
            size="sm" 
            onClick={() => sendFriendRequest(user.id)}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Connect
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold gradient-text-cyber flex items-center justify-center gap-2 sm:gap-3">
            <Users className="w-7 h-7 sm:w-10 sm:h-10" />
            Discover Traders
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Connect with traders from around the world
          </p>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 sm:p-3 bg-background/50 rounded-lg gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                      <AvatarImage src={request.profiles?.avatar_url} />
                      <AvatarFallback>{request.profiles?.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{request.profiles?.display_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{request.profiles?.country}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => handleRequest(request.id, true)} className="h-8 px-2 sm:px-3">
                      <Check className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Accept</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRequest(request.id, false)} className="h-8 px-2">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Search & Filters */}
        <Card className="glass-card p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map(country => (
                  <SelectItem key={country} value={country!}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Users Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="glass-card p-8 sm:p-12 text-center">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg sm:text-xl font-bold mb-2">No users found</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Try adjusting your search or filters</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredUsers.map((user) => (
              <Card 
                key={user.id} 
                className="glass-card p-3 sm:p-4 hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                  <div 
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0"
                    onClick={() => navigate(`/profile/${user.id}`)}
                  >
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-primary/30 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-sm">
                        {user.display_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{user.display_name}</h3>
                      {user.username && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">@{user.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getConnectionButton(user)}
                  </div>
                </div>

                {user.bio && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{user.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  {user.country && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      {user.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-primary">
                    <Zap className="w-3 h-3" />
                    {user.xp_points?.toLocaleString() || 0} XP
                  </span>
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Trophy className="w-3 h-3" />
                    Lvl {user.rank_level || 1}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;