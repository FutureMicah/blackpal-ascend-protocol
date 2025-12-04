import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, ShieldCheck, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Friend {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  verification_badge: string | null;
  country: string | null;
  xp_points: number | null;
}

interface FriendsListProps {
  friends: Friend[];
  loading: boolean;
  selectedFriendId?: string;
  onSelectFriend: (friend: Friend) => void;
  currentUserId: string | null;
}

export const FriendsList = ({
  friends,
  loading,
  selectedFriendId,
  onSelectFriend,
  currentUserId
}: FriendsListProps) => {
  const [search, setSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUserId) return;

    const fetchUnreadCounts = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);

      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach(msg => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      }
    };

    fetchUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          const senderId = payload.new.sender_id;
          setUnreadCounts(prev => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const filteredFriends = friends.filter(friend =>
    friend.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const getVerificationIcon = (badge: string | null) => {
    switch (badge) {
      case 'gold':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'verified':
        return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case 'premium':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-full rounded-xl bg-card border border-border p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl bg-card border border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredFriends.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {friends.length === 0 ? "No friends yet" : "No results found"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFriends.map((friend, index) => (
              <motion.button
                key={friend.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectFriend(friend)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedFriendId === friend.id
                    ? "bg-primary/20 border border-primary/30"
                    : "hover:bg-muted"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt=""
                        className="w-12 h-12 object-cover"
                      />
                    ) : (
                      <span className="text-primary font-bold text-lg">
                        {friend.display_name[0]}
                      </span>
                    )}
                  </div>
                  {unreadCounts[friend.id] > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                      {unreadCounts[friend.id]}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{friend.display_name}</span>
                    {friend.is_verified && getVerificationIcon(friend.verification_badge)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {friend.country && <span>{friend.country}</span>}
                    {friend.xp_points && (
                      <Badge variant="secondary" className="text-xs">
                        {friend.xp_points.toLocaleString()} XP
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
