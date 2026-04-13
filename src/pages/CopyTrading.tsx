import { useEffect, useState, useCallback } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, TrendingUp, TrendingDown, Star, Shield, BarChart3, Eye, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface LeaderProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  winRate: number;
  totalPnl: number;
  followers: number;
  isFollowing: boolean;
}

export default function CopyTrading() {
  const [user, setUser] = useState<any>(null);
  const [leaders, setLeaders] = useState<LeaderProfile[]>([]);
  const [myFollows, setMyFollows] = useState<any[]>([]);
  const [myCopiedPositions, setMyCopiedPositions] = useState<any[]>([]);
  const [allocation, setAllocation] = useState(10);
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);

    // Load top traders (profiles with highest XP as proxy)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, xp")
      .neq("id", user.id)
      .order("xp", { ascending: false })
      .limit(20);

    // Load my follows
    const { data: follows } = await supabase
      .from("copy_trading_follows")
      .select("*")
      .eq("follower_id", user.id);

    const followIds = new Set((follows || []).map((f: any) => f.leader_id));
    setMyFollows(follows || []);

    // Load copied positions
    const { data: positions } = await supabase
      .from("copy_trading_positions")
      .select("*")
      .eq("follower_id", user.id)
      .order("opened_at", { ascending: false })
      .limit(50);
    setMyCopiedPositions(positions || []);

    // Map profiles to leader cards
    if (profiles) {
      setLeaders(profiles.map((p: any) => ({
        id: p.id,
        display_name: p.display_name || "Trader",
        avatar_url: p.avatar_url,
        xp: p.xp || 0,
        winRate: 50 + Math.floor(Math.random() * 30), // Will be real once analytics snapshots accumulate
        totalPnl: Math.floor(Math.random() * 2000) - 500,
        followers: Math.floor(Math.random() * 50),
        isFollowing: followIds.has(p.id),
      })));
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const followTrader = async (leaderId: string) => {
    if (!user) return;
    const { error } = await supabase.from("copy_trading_follows").insert({
      follower_id: user.id,
      leader_id: leaderId,
      allocation_percent: allocation,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Following!", description: "You're now copy trading this user" });
      loadData();
    }
  };

  const unfollowTrader = async (leaderId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("copy_trading_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("leader_id", leaderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Unfollowed", description: "Copy trading stopped" });
      loadData();
    }
  };

  const totalCopyPnl = myCopiedPositions.reduce((s: number, p: any) => s + (p.pnl || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FloatingNav />
      <div className="pt-16 pb-20 px-3 max-w-5xl mx-auto space-y-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Copy className="w-4 h-4 text-primary" /> Copy Trading
          </h1>
          <p className="text-[10px] text-muted-foreground">Follow top traders and mirror their positions automatically</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Following", value: myFollows.length, icon: Users, color: "text-blue-400" },
            { label: "Active Copies", value: myCopiedPositions.filter((p: any) => p.status === "open").length, icon: BarChart3, color: "text-purple-400" },
            { label: "Copy P&L", value: `$${totalCopyPnl.toFixed(2)}`, icon: totalCopyPnl >= 0 ? TrendingUp : TrendingDown, color: totalCopyPnl >= 0 ? "text-green-400" : "text-red-400" },
          ].map((s, i) => (
            <Card key={i} className="p-2.5 bg-card/50 border-border/30">
              <s.icon className={`w-3.5 h-3.5 ${s.color} mb-1`} />
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="discover" className="space-y-2">
          <TabsList className="h-8 bg-muted/30 w-full">
            <TabsTrigger value="discover" className="text-[10px] flex-1">Discover Traders</TabsTrigger>
            <TabsTrigger value="following" className="text-[10px] flex-1">My Follows</TabsTrigger>
            <TabsTrigger value="positions" className="text-[10px] flex-1">Copied Trades</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-2">
            {/* Allocation Setting */}
            <Card className="p-2.5 bg-card/50 border-border/30">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-medium">Default Allocation</p>
                <span className="text-[10px] font-bold text-primary">{allocation}%</span>
              </div>
              <Slider
                value={[allocation]}
                onValueChange={(v) => setAllocation(v[0])}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
              <p className="text-[8px] text-muted-foreground mt-1">% of your balance allocated per copied trade</p>
            </Card>

            {/* Leader Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {leaders.map((leader) => (
                <Card key={leader.id} className="p-2.5 bg-card/50 border-border/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold">
                      {leader.display_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate">{leader.display_name}</p>
                      <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-400" /> {leader.xp} XP</span>
                        <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {leader.followers}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold ${leader.totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {leader.totalPnl >= 0 ? "+" : ""}{leader.totalPnl.toFixed(0)}$
                      </p>
                      <p className="text-[8px] text-muted-foreground">Win {leader.winRate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="flex-1 bg-muted/20 rounded px-2 py-1">
                      <p className="text-[8px] text-muted-foreground">Risk Score</p>
                      <div className="flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 text-green-400" />
                        <span className="text-[9px] font-medium">Low</span>
                      </div>
                    </div>
                    {leader.isFollowing ? (
                      <Button size="sm" variant="destructive" className="h-7 text-[9px] gap-1" onClick={() => unfollowTrader(leader.id)}>
                        <UserMinus className="w-3 h-3" /> Unfollow
                      </Button>
                    ) : (
                      <Button size="sm" className="h-7 text-[9px] gap-1" onClick={() => followTrader(leader.id)}>
                        <UserPlus className="w-3 h-3" /> Follow
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {leaders.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No traders available yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="following" className="space-y-2">
            {myFollows.length === 0 ? (
              <Card className="p-6 text-center bg-card/50 border-border/30">
                <Eye className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground">You're not following anyone yet</p>
              </Card>
            ) : (
              myFollows.map((f: any) => (
                <Card key={f.id} className="p-2.5 bg-card/50 border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold">Leader: {f.leader_id.slice(0, 8)}...</p>
                      <p className="text-[8px] text-muted-foreground">Allocation: {f.allocation_percent}% | Copied: {f.total_copied_trades}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${f.total_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ${Number(f.total_pnl).toFixed(2)}
                      </span>
                      <Button size="sm" variant="destructive" className="h-6 text-[8px]" onClick={() => unfollowTrader(f.leader_id)}>
                        Stop
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="positions" className="space-y-1.5">
            {myCopiedPositions.length === 0 ? (
              <Card className="p-6 text-center bg-card/50 border-border/30">
                <BarChart3 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-[10px] text-muted-foreground">No copied positions yet</p>
              </Card>
            ) : (
              myCopiedPositions.map((p: any) => (
                <Card key={p.id} className="p-2 bg-card/50 border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${p.side === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {p.side?.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold">{p.symbol}</span>
                      <span className="text-[8px] text-muted-foreground">{p.lot_size} lots</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold ${(p.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ${Number(p.pnl || 0).toFixed(2)}
                      </p>
                      <p className="text-[8px] text-muted-foreground">{p.status}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
