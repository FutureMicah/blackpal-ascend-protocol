import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { FriendsList } from "@/components/chat/FriendsList";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Search, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Friend {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  verification_badge: string | null;
  country: string | null;
  xp_points: number | null;
}

const Friends = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUserId(user.id);
      fetchFriends(user.id);
      fetchPendingRequests(user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchFriends = async (userId: string) => {
    try {
      const { data: connections, error } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;

      const friendIds = connections?.map(c => 
        c.user_id === userId ? c.friend_id : c.user_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, is_verified, verification_badge, country, xp_points')
          .in('id', friendIds);

        if (profileError) throw profileError;
        setFriends(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async (userId: string) => {
    try {
      const { data: requests, error } = await supabase
        .from('friend_connections')
        .select('id, user_id, created_at')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      if (requests && requests.length > 0) {
        const userIds = requests.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        const enrichedRequests = requests.map(r => ({
          ...r,
          profile: profiles?.find(p => p.id === r.user_id)
        }));
        setPendingRequests(enrichedRequests);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    try {
      await supabase
        .from('friend_connections')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      if (currentUserId) fetchFriends(currentUserId);
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await supabase
        .from('friend_connections')
        .delete()
        .eq('id', requestId);

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setView('chat');
  };

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      
      <div className="pt-16 sm:pt-20 pb-4 sm:pb-8 px-2 sm:px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {view === 'chat' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView('list')}
                  className="md:hidden h-8 w-8"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-xl sm:text-3xl font-bold">Friends</h1>
            </div>
            <Button onClick={() => navigate('/discover')} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Find Friends</span>
              <span className="sm:hidden">Find</span>
            </Button>
          </div>
        </motion.div>

        {/* Pending Requests */}
        <AnimatePresence>
          {pendingRequests.length > 0 && view === 'list' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <h2 className="text-lg font-semibold mb-3 text-primary">
                Pending Requests ({pendingRequests.length})
              </h2>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {request.profile?.avatar_url ? (
                          <img
                            src={request.profile.avatar_url}
                            alt=""
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-bold">
                            {request.profile?.display_name?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-sm sm:text-base">{request.profile?.display_name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.id, request.user_id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineRequest(request.id)}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-6 h-[calc(100vh-180px)] sm:h-[calc(100vh-220px)]">
          {/* Friends List */}
          <div className={`md:col-span-1 ${view === 'chat' ? 'hidden md:block' : ''}`}>
            <FriendsList
              friends={friends}
              loading={loading}
              selectedFriendId={selectedFriend?.id}
              onSelectFriend={handleSelectFriend}
              currentUserId={currentUserId}
            />
          </div>

          {/* Chat Area */}
          <div className={`md:col-span-2 ${view === 'list' ? 'hidden md:block' : ''}`}>
            {selectedFriend && currentUserId ? (
              <ChatRoom
                friend={selectedFriend}
                currentUserId={currentUserId}
              />
            ) : (
              <div className="h-full flex items-center justify-center rounded-xl bg-card border border-border">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a friend to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
