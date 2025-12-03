import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Gift, Trophy, Star, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Loader2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BlackCoin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const action = searchParams.get("action") || "overview";
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);
      await loadBalance(user.id);
    };
    init();
  }, [navigate]);

  const loadBalance = async (uid: string) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("virtual_currency")
        .eq("id", uid)
        .single();
      
      setBalance(data?.virtual_currency || 0);
    } catch (error) {
      console.error("Error loading balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!userId || !depositAmount) return;
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ virtual_currency: balance + amount })
        .eq("id", userId);

      if (error) throw error;

      setBalance(prev => prev + amount);
      setDepositAmount("");
      toast({ title: "Deposit successful!", description: `+${amount} BTC added to your wallet` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userId || !withdrawAmount) return;
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    if (amount > balance) {
      toast({ variant: "destructive", title: "Insufficient balance" });
      return;
    }
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ virtual_currency: balance - amount })
        .eq("id", userId);

      if (error) throw error;

      setBalance(prev => prev - amount);
      setWithdrawAmount("");
      toast({ title: "Withdrawal initiated!", description: `${amount} BTC withdrawal pending` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!userId || !convertAmount) return;
    const amount = parseInt(convertAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount" });
      return;
    }
    if (amount > balance) {
      toast({ variant: "destructive", title: "Insufficient balance" });
      return;
    }
    
    // Simulate conversion - in real app this would convert to another currency
    toast({ title: "Conversion complete!", description: `${amount} BTC converted` });
    setConvertAmount("");
  };

  const claimReward = async (rewardXP: number, rewardName: string) => {
    if (!userId) return;
    
    setProcessing(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("virtual_currency, xp_points")
        .eq("id", userId)
        .single();

      await supabase
        .from("profiles")
        .update({ 
          virtual_currency: (profile?.virtual_currency || 0) + rewardXP,
          xp_points: (profile?.xp_points || 0) + Math.floor(rewardXP / 10)
        })
        .eq("id", userId);

      setBalance(prev => prev + rewardXP);
      toast({ title: "Reward claimed!", description: `+${rewardXP} BTC for ${rewardName}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const usdEquivalent = (balance * 0.001).toFixed(2);

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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Coins className="w-10 h-10 text-gold animate-pulse" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackCoin</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your virtual currency and unlock exclusive rewards
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="lg:col-span-2">
            <Card className="glass-card p-8 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Coins className="w-5 h-5" />
                <span className="text-sm font-medium">Your Balance</span>
              </div>
              <div className="flex items-end gap-3 mb-6">
                <h2 className="text-6xl font-bold gradient-text-cyber">{balance.toLocaleString()}</h2>
                <span className="text-2xl text-muted-foreground mb-2">BTC</span>
              </div>
              <p className="text-muted-foreground">~${usdEquivalent} USD</p>
            </Card>

            {/* Action Tabs */}
            <Card className="glass-card p-6">
              <Tabs defaultValue={action} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="deposit" className="flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4" />
                    Deposit
                  </TabsTrigger>
                  <TabsTrigger value="convert" className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Convert
                  </TabsTrigger>
                  <TabsTrigger value="withdraw" className="flex items-center gap-2">
                    <ArrowUpFromLine className="w-4 h-4" />
                    Withdraw
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="deposit" className="space-y-4">
                  <h3 className="text-lg font-bold">Deposit Funds</h3>
                  <p className="text-sm text-muted-foreground">
                    Add virtual currency to your wallet. In a real app, this would connect to payment processing.
                  </p>
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      placeholder="Amount to deposit"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleDeposit} 
                      disabled={processing || !depositAmount}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deposit"}
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {[100, 500, 1000, 5000].map(amount => (
                      <Button 
                        key={amount}
                        variant="outline" 
                        size="sm"
                        onClick={() => setDepositAmount(amount.toString())}
                      >
                        +{amount}
                      </Button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="convert" className="space-y-4">
                  <h3 className="text-lg font-bold">Convert Currency</h3>
                  <p className="text-sm text-muted-foreground">
                    Convert between different virtual currencies.
                  </p>
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      placeholder="Amount to convert"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleConvert} 
                      disabled={processing || !convertAmount}
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="withdraw" className="space-y-4">
                  <h3 className="text-lg font-bold">Withdraw Funds</h3>
                  <p className="text-sm text-muted-foreground">
                    Withdraw your virtual currency. KYC verification required for real withdrawals.
                  </p>
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      placeholder="Amount to withdraw"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleWithdraw} 
                      disabled={processing || !withdrawAmount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw"}
                    </Button>
                  </div>
                  <p className="text-xs text-yellow-500">
                    Available: {balance.toLocaleString()} BTC
                  </p>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Rewards & Earning */}
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold gradient-text-cyber mb-4">Earn Coins</h2>
              <div className="space-y-3">
                {[
                  { title: "Daily Login", coins: 100, icon: Star, color: "text-yellow-500" },
                  { title: "Complete Profile", coins: 500, icon: TrendingUp, color: "text-green-500" },
                  { title: "Weekly Streak", coins: 1000, icon: Zap, color: "text-blue-500" },
                  { title: "Invite Friend", coins: 2000, icon: Gift, color: "text-purple-500" },
                ].map((reward, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-background/30 rounded-lg hover:bg-background/50 transition-all"
                  >
                    <reward.icon className={`w-6 h-6 ${reward.color}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{reward.title}</p>
                      <p className="text-xs text-gold">+{reward.coins} BTC</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => claimReward(reward.coins, reward.title)}
                      disabled={processing}
                    >
                      Claim
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold gradient-text-cyber mb-4">Rewards Shop</h2>
              <div className="space-y-3">
                {[
                  { name: "Premium Badge", cost: 5000, icon: Trophy },
                  { name: "Custom Avatar Frame", cost: 3000, icon: Star },
                  { name: "Profile Boost", cost: 2000, icon: Zap },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-background/30 rounded-lg"
                  >
                    <item.icon className="w-6 h-6 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gold">{item.cost.toLocaleString()} BTC</p>
                    </div>
                    <Button 
                      size="sm"
                      disabled={balance < item.cost}
                      variant={balance >= item.cost ? "default" : "outline"}
                    >
                      {balance >= item.cost ? "Buy" : "Locked"}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackCoin;