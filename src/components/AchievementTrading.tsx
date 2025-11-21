import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift, Send, Check, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Trade {
  id: string;
  from_user_id: string;
  to_user_id: string;
  achievement_id: string;
  trade_type: string;
  status: string;
  message: string;
  created_at: string;
  from_profile?: any;
  to_profile?: any;
  achievement?: any;
}

interface AchievementTradingProps {
  userId: string;
}

export const AchievementTrading = ({ userId }: AchievementTradingProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState("");
  const [selectedFriend, setSelectedFriend] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");
  const [tradeType, setTradeType] = useState<"gift" | "trade">("gift");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTrades();
    loadUserAchievements();
    loadFriends();
    setupRealtimeSubscription();
  }, [userId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('achievement-trades')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'achievement_trades',
          filter: `to_user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Trade update:', payload);
          loadTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadTrades = async () => {
    try {
      const { data, error } = await supabase
        .from("achievement_trades")
        .select(`
          *,
          from_profile:profiles!achievement_trades_from_user_id_fkey(display_name, avatar_url),
          to_profile:profiles!achievement_trades_to_user_id_fkey(display_name, avatar_url),
          achievement:achievements(name, icon, rarity)
        `)
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAchievements = async () => {
    try {
      const { data } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity
          )
        `)
        .eq("user_id", userId);

      setUserAchievements(data?.map(ua => ua.achievements).filter(Boolean) || []);
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  };

  const loadFriends = async () => {
    try {
      const { data } = await supabase
        .from("friend_connections")
        .select(`
          friend_id,
          profiles:profiles!friend_connections_friend_id_fkey(id, display_name, avatar_url)
        `)
        .eq("user_id", userId)
        .eq("status", "accepted");

      setFriends(data?.map(f => f.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const sendTrade = async () => {
    if (!selectedAchievement || !selectedFriend) {
      toast({
        title: "Incomplete",
        description: "Please select an achievement and friend",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("achievement_trades")
        .insert({
          from_user_id: userId,
          to_user_id: selectedFriend,
          achievement_id: selectedAchievement,
          trade_type: tradeType,
          message: tradeMessage,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: tradeType === "gift" ? "Gift Sent!" : "Trade Proposed!",
        description: "Your friend will be notified",
      });

      setSelectedAchievement("");
      setSelectedFriend("");
      setTradeMessage("");
      setIsDialogOpen(false);
      loadTrades();
    } catch (error) {
      console.error("Error sending trade:", error);
      toast({
        title: "Error",
        description: "Failed to send trade",
        variant: "destructive",
      });
    }
  };

  const respondToTrade = async (tradeId: string, accept: boolean) => {
    try {
      if (accept) {
        // Update trade status
        const { error: updateError } = await supabase
          .from("achievement_trades")
          .update({ 
            status: "accepted",
            completed_at: new Date().toISOString(),
          })
          .eq("id", tradeId);

        if (updateError) throw updateError;

        // Transfer achievement
        const trade = trades.find(t => t.id === tradeId);
        if (trade) {
          const { error: transferError } = await supabase
            .from("user_achievements")
            .insert({
              user_id: trade.to_user_id,
              achievement_id: trade.achievement_id,
            });

          if (transferError && transferError.code !== '23505') throw transferError;
        }

        toast({
          title: "Trade Accepted!",
          description: "Achievement has been transferred",
        });
      } else {
        await supabase
          .from("achievement_trades")
          .update({ status: "rejected" })
          .eq("id", tradeId);

        toast({
          title: "Trade Rejected",
          description: "The trade has been declined",
        });
      }

      loadTrades();
    } catch (error) {
      console.error("Error responding to trade:", error);
      toast({
        title: "Error",
        description: "Failed to process trade",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">Loading trades...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Achievement Trading
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gift or trade exclusive badges with friends
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              New Trade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Achievement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={tradeType} onValueChange={(v: any) => setTradeType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift">🎁 Gift (Free)</SelectItem>
                  <SelectItem value="trade">🔄 Trade (Request One Back)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedAchievement} onValueChange={setSelectedAchievement}>
                <SelectTrigger>
                  <SelectValue placeholder="Select achievement" />
                </SelectTrigger>
                <SelectContent>
                  {userAchievements.map((ach: any) => (
                    <SelectItem key={ach.id} value={ach.id}>
                      {ach.icon} {ach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                <SelectTrigger>
                  <SelectValue placeholder="Select friend" />
                </SelectTrigger>
                <SelectContent>
                  {friends.map((friend: any) => (
                    <SelectItem key={friend.id} value={friend.id}>
                      {friend.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Add a message (optional)"
                value={tradeMessage}
                onChange={(e) => setTradeMessage(e.target.value)}
              />

              <Button onClick={sendTrade} className="w-full">
                {tradeType === "gift" ? "Send Gift" : "Propose Trade"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trades List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {trades.map((trade, index) => {
            const isReceived = trade.to_user_id === userId;
            const isPending = trade.status === "pending";

            return (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: isReceived ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-4 ${isPending && isReceived ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={isReceived ? trade.from_profile?.avatar_url : trade.to_profile?.avatar_url} />
                      <AvatarFallback>
                        {isReceived ? trade.from_profile?.display_name?.charAt(0) : trade.to_profile?.display_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">
                          {isReceived ? trade.from_profile?.display_name : trade.to_profile?.display_name}
                        </span>
                        <Badge variant={trade.trade_type === "gift" ? "default" : "secondary"}>
                          {trade.trade_type === "gift" ? "🎁 Gift" : "🔄 Trade"}
                        </Badge>
                        <Badge variant={
                          trade.status === "accepted" ? "default" :
                          trade.status === "rejected" ? "destructive" : "secondary"
                        }>
                          {trade.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-2xl">{trade.achievement?.icon}</span>
                        <span className="font-medium">{trade.achievement?.name}</span>
                      </div>

                      {trade.message && (
                        <p className="text-sm text-muted-foreground mt-1">{trade.message}</p>
                      )}
                    </div>

                    {isPending && isReceived && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondToTrade(trade.id, true)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respondToTrade(trade.id, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {trades.length === 0 && (
          <Card className="p-12 text-center">
            <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">No Trades Yet</h3>
            <p className="text-muted-foreground">
              Start trading achievements with your friends!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
