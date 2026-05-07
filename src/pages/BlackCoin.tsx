import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, TrendingUp, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Zap, Gift, Trophy, Star, Loader2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import { MetalloidCoin } from "@/components/MetalloidCoin";
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
      if (!user) { navigate("/"); return; }
      setUserId(user.id);
      await loadBalance(user.id);
    };
    init();
  }, [navigate]);

  const loadBalance = async (uid: string) => {
    setLoading(true);
    try { const { data } = await supabase.from("profiles").select("virtual_currency").eq("id", uid).single(); setBalance(data?.virtual_currency || 0); } catch {} finally { setLoading(false); }
  };

  const handleDeposit = async () => {
    if (!userId || !depositAmount) return;
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) { toast({ variant: "destructive", title: "Invalid amount" }); return; }
    setProcessing(true);
    try {
      const { error } = await supabase.from("profiles").update({ virtual_currency: balance + amount }).eq("id", userId);
      if (error) throw error;
      setBalance(prev => prev + amount); setDepositAmount("");
      toast({ title: "Deposit successful!", description: `+${amount} BTAX added` });
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); } finally { setProcessing(false); }
  };

  const handleWithdraw = async () => {
    if (!userId || !withdrawAmount) return;
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { toast({ variant: "destructive", title: "Invalid amount" }); return; }
    if (amount > balance) { toast({ variant: "destructive", title: "Insufficient balance" }); return; }
    setProcessing(true);
    try {
      const { error } = await supabase.from("profiles").update({ virtual_currency: balance - amount }).eq("id", userId);
      if (error) throw error;
      setBalance(prev => prev - amount); setWithdrawAmount("");
      toast({ title: "Withdrawal initiated!", description: `${amount} BTAX pending` });
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); } finally { setProcessing(false); }
  };

  const handleConvert = async () => {
    if (!convertAmount) return;
    const amount = parseInt(convertAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) { toast({ variant: "destructive", title: "Invalid" }); return; }
    toast({ title: "Conversion complete!", description: `${amount} BTAX converted` });
    setConvertAmount("");
  };

  const claimReward = async (coins: number, name: string) => {
    if (!userId) return;
    setProcessing(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("virtual_currency, xp_points").eq("id", userId).single();
      await supabase.from("profiles").update({ virtual_currency: (profile?.virtual_currency || 0) + coins, xp_points: (profile?.xp_points || 0) + Math.floor(coins / 10) }).eq("id", userId);
      setBalance(prev => prev + coins);
      toast({ title: "Claimed!", description: `+${coins} BTAX for ${name}` });
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); } finally { setProcessing(false); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold">BlackCoin</h1>
          </div>
          <p className="text-xs text-muted-foreground">Manage currency & unlock rewards</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            {/* Balance + 3D coin */}
            <Card className="p-3 sm:p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-32 h-32 sm:w-40 sm:h-40 pointer-events-auto">
                <MetalloidCoin />
              </div>
              <div className="relative z-10 max-w-[55%]">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                  <Coins className="w-3.5 h-3.5" /> Your Balance
                </div>
                <div className="flex items-end gap-2 mb-1">
                  <h2 className="text-2xl sm:text-4xl font-bold font-mono">{balance.toLocaleString()}</h2>
                  <span className="text-sm text-muted-foreground mb-0.5">BTAX</span>
                </div>
                <p className="text-[10px] text-muted-foreground">~₦{(balance * 100).toLocaleString()}</p>
              </div>
            </Card>

            {/* Action Tabs */}
            <Card className="p-3 sm:p-4">
              <Tabs defaultValue={action} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-3 h-8">
                  <TabsTrigger value="deposit" className="text-[10px] gap-1"><ArrowDownToLine className="w-3 h-3" />Deposit</TabsTrigger>
                  <TabsTrigger value="convert" className="text-[10px] gap-1"><RefreshCw className="w-3 h-3" />Convert</TabsTrigger>
                  <TabsTrigger value="withdraw" className="text-[10px] gap-1"><ArrowUpFromLine className="w-3 h-3" />Withdraw</TabsTrigger>
                </TabsList>
                <TabsContent value="deposit" className="space-y-2">
                  <h3 className="text-xs font-bold">Deposit Funds</h3>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Amount" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="flex-1 h-8 text-xs" />
                    <Button onClick={handleDeposit} disabled={processing || !depositAmount} className="h-8 text-xs bg-green-600 hover:bg-green-700">
                      {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Deposit"}
                    </Button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[100, 500, 1000, 5000].map(a => (
                      <Button key={a} variant="outline" size="sm" className="h-6 text-[9px] px-2" onClick={() => setDepositAmount(a.toString())}>+{a}</Button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="convert" className="space-y-3">
                  <h3 className="text-xs font-bold">Naira ↔ BTAX Converter</h3>
                  <CurrencyConverter compact={false} />
                  <p className="text-[9px] text-muted-foreground text-center">
                    Use the converter to plan funding amounts before depositing.
                  </p>
                </TabsContent>
                <TabsContent value="withdraw" className="space-y-2">
                  <h3 className="text-xs font-bold">Withdraw Funds</h3>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="flex-1 h-8 text-xs" />
                    <Button onClick={handleWithdraw} disabled={processing || !withdrawAmount} className="h-8 text-xs bg-red-600 hover:bg-red-700">{processing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Withdraw"}</Button>
                  </div>
                  <p className="text-[9px] text-yellow-500">Available: {balance.toLocaleString()} BTAX</p>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Rewards */}
          <div className="space-y-3">
            <Card className="p-3">
              <h2 className="text-xs font-bold mb-2">Earn Coins</h2>
              <div className="space-y-1.5">
                {[
                  { title: "Daily Login", coins: 100, icon: Star, color: "text-yellow-500" },
                  { title: "Complete Profile", coins: 500, icon: TrendingUp, color: "text-green-500" },
                  { title: "Weekly Streak", coins: 1000, icon: Zap, color: "text-blue-500" },
                  { title: "Invite Friend", coins: 2000, icon: Gift, color: "text-purple-500" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                    <r.icon className={`w-4 h-4 ${r.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{r.title}</p>
                      <p className="text-[9px] text-primary">+{r.coins} BTAX</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-6 text-[9px] px-2 shrink-0" onClick={() => claimReward(r.coins, r.title)} disabled={processing}>Claim</Button>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-3">
              <h2 className="text-xs font-bold mb-2">Rewards Shop</h2>
              <div className="space-y-1.5">
                {[
                  { name: "Premium Badge", cost: 5000, icon: Trophy },
                  { name: "Avatar Frame", cost: 3000, icon: Star },
                  { name: "Profile Boost", cost: 2000, icon: Zap },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                    <item.icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{item.name}</p>
                      <p className="text-[9px] text-primary">{item.cost.toLocaleString()} BTAX</p>
                    </div>
                    <Button size="sm" className="h-6 text-[9px] px-2 shrink-0" disabled={balance < item.cost} variant={balance >= item.cost ? "default" : "outline"}>
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
