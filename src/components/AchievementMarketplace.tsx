import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Gavel, TrendingUp, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Auction {
  id: string;
  seller_id: string;
  achievement_id: string;
  starting_bid: number;
  current_bid: number;
  buyout_price: number | null;
  auction_end_date: string;
  status: string;
  achievement: {
    name: string;
    icon: string;
    rarity: string;
  };
  bid_count?: number;
}

interface AchievementMarketplaceProps {
  userId: string;
}

export const AchievementMarketplace = ({ userId }: AchievementMarketplaceProps) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [userCurrency, setUserCurrency] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bidAmounts, setBidAmounts] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadMarketplaceData();
    
    // Subscribe to auction updates
    const channel = supabase
      .channel("marketplace-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "achievement_auctions",
        },
        () => loadMarketplaceData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMarketplaceData = async () => {
    try {
      // Fetch user currency
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("virtual_currency")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      setUserCurrency(profile?.virtual_currency || 0);

      // Fetch active auctions
      const { data: auctionData, error: auctionError } = await supabase
        .from("achievement_auctions")
        .select(`
          *,
          achievement:achievements(name, icon, rarity)
        `)
        .eq("status", "active")
        .gt("auction_end_date", new Date().toISOString())
        .order("auction_end_date");

      if (auctionError) throw auctionError;

      // Get bid counts
      const auctionsWithBids = await Promise.all(
        (auctionData || []).map(async (auction) => {
          const { count } = await supabase
            .from("auction_bids")
            .select("*", { count: "exact", head: true })
            .eq("auction_id", auction.id);

          return { ...auction, bid_count: count || 0 };
        })
      );

      setAuctions(auctionsWithBids as any);
    } catch (error) {
      console.error("Error loading marketplace:", error);
    } finally {
      setLoading(false);
    }
  };

  const placeBid = async (auctionId: string, bidAmount: number) => {
    const auction = auctions.find((a) => a.id === auctionId);
    if (!auction) return;

    if (bidAmount <= auction.current_bid) {
      toast({
        title: "Invalid Bid",
        description: "Your bid must be higher than the current bid!",
        variant: "destructive",
      });
      return;
    }

    if (bidAmount > userCurrency) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough currency for this bid!",
        variant: "destructive",
      });
      return;
    }

    try {
      // Place bid
      await supabase.from("auction_bids").insert({
        auction_id: auctionId,
        bidder_id: userId,
        bid_amount: bidAmount,
      });

      // Update auction current bid
      await supabase
        .from("achievement_auctions")
        .update({ current_bid: bidAmount })
        .eq("id", auctionId);

      toast({
        title: "Bid Placed! 🎯",
        description: `Your bid of ${bidAmount} currency has been placed!`,
      });

      loadMarketplaceData();
    } catch (error) {
      console.error("Error placing bid:", error);
      toast({
        title: "Bid Failed",
        description: "Could not place your bid. Please try again.",
        variant: "destructive",
      });
    }
  };

  const buyout = async (auctionId: string, buyoutPrice: number) => {
    if (buyoutPrice > userCurrency) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough currency for buyout!",
        variant: "destructive",
      });
      return;
    }

    try {
      const auction = auctions.find((a) => a.id === auctionId);
      if (!auction) return;

      // Update auction status
      await supabase
        .from("achievement_auctions")
        .update({ status: "completed", winner_id: userId })
        .eq("id", auctionId);

      // Deduct currency from buyer
      await supabase
        .from("profiles")
        .update({ virtual_currency: userCurrency - buyoutPrice })
        .eq("id", userId);

      // Add currency to seller
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("virtual_currency")
        .eq("id", auction.seller_id)
        .single();

      if (sellerProfile) {
        await supabase
          .from("profiles")
          .update({ virtual_currency: sellerProfile.virtual_currency + buyoutPrice })
          .eq("id", auction.seller_id);
      }

      // Transfer achievement
      await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: auction.achievement_id,
      });

      toast({
        title: "Purchase Complete! 🎉",
        description: `You've acquired ${auction.achievement.icon} ${auction.achievement.name}!`,
      });

      loadMarketplaceData();
    } catch (error) {
      console.error("Error buying out auction:", error);
      toast({
        title: "Purchase Failed",
        description: "Could not complete the purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const remaining = new Date(endDate).getTime() - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-primary/10 border-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <span className="font-semibold">Your Currency:</span>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {userCurrency.toLocaleString()}
          </Badge>
        </div>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            <TrendingUp className="h-4 w-4 mr-2" />
            Active Auctions
          </TabsTrigger>
          <TabsTrigger value="my-bids">
            <Gavel className="h-4 w-4 mr-2" />
            My Bids
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {auctions.map((auction, index) => (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{auction.achievement.icon}</div>
                      <Badge variant="outline">{auction.achievement.rarity}</Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{auction.achievement.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeRemaining(auction.auction_end_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gavel className="h-3 w-3" />
                          {auction.bid_count} bids
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Bid</p>
                      <p className="text-2xl font-bold">{auction.current_bid}</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Bid amount"
                        value={bidAmounts.get(auction.id) || ""}
                        onChange={(e) => {
                          const newMap = new Map(bidAmounts);
                          newMap.set(auction.id, parseInt(e.target.value) || 0);
                          setBidAmounts(newMap);
                        }}
                        className="w-32"
                      />
                      <Button
                        onClick={() =>
                          placeBid(auction.id, bidAmounts.get(auction.id) || 0)
                        }
                        disabled={auction.seller_id === userId}
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        Bid
                      </Button>
                    </div>
                    {auction.buyout_price && (
                      <Button
                        variant="secondary"
                        onClick={() => buyout(auction.id, auction.buyout_price!)}
                        disabled={auction.seller_id === userId}
                        className="w-full"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Buyout: {auction.buyout_price}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {auctions.length === 0 && (
            <Card className="p-12 text-center">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active auctions available</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-bids">
          <Card className="p-12 text-center">
            <Gavel className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Your bidding history will appear here</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
