import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vault, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
}

const BlackVault = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [xpPoints, setXpPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      await loadData(user.id);
    };
    init();
  }, [navigate]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Load profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("virtual_currency, xp_points")
        .eq("id", userId)
        .single();

      if (profile) {
        setBalance(profile.virtual_currency || 0);
        setXpPoints(profile.xp_points || 0);
      }

      // Load payment history
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      setPayments(paymentData || []);

      // Create transaction history from various sources
      const { data: achievements } = await supabase
        .from("user_achievements")
        .select("*, achievements(name, xp_reward)")
        .eq("user_id", userId)
        .order("awarded_at", { ascending: false })
        .limit(5);

      const txns: Transaction[] = [];
      
      // Add achievements as earning transactions
      achievements?.forEach(a => {
        txns.push({
          id: a.id,
          type: "Achievement Reward",
          amount: a.achievements?.xp_reward || 0,
          date: a.awarded_at || new Date().toISOString(),
          status: "completed"
        });
      });

      // Add payments as transactions
      paymentData?.forEach(p => {
        txns.push({
          id: p.id,
          type: `${p.payment_tier} Payment`,
          amount: -p.amount_usd,
          date: p.created_at,
          status: p.payment_status || "pending"
        });
      });

      setTransactions(txns.slice(0, 10));
    } catch (error) {
      console.error("Error loading vault data:", error);
    } finally {
      setLoading(false);
    }
  };

  const usdEquivalent = (balance * 0.001).toFixed(2);
  const monthlyGain = Math.floor(balance * 0.15);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <FloatingNav />
      
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background to-gold/5" />

      <div className="max-w-7xl mx-auto pt-16">
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-3 gradient-text-wealth flex items-center gap-3">
            <Vault className="w-12 h-12" />
            BlackVault
          </h1>
          <p className="text-xl text-muted-foreground">
            Your financial command center — Track earnings, transactions, and wealth
          </p>
        </header>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="glass-card p-8">
            <DollarSign className="w-10 h-10 text-gold mb-4" />
            <p className="text-muted-foreground text-sm mb-2">Total Balance</p>
            <h2 className="text-4xl font-bold text-foreground">{balance.toLocaleString()} BTC</h2>
            <p className="text-sm text-muted-foreground mt-1">~${usdEquivalent} USD</p>
          </Card>
          
          <Card className="glass-card p-8">
            <TrendingUp className="w-10 h-10 text-green-500 mb-4" />
            <p className="text-muted-foreground text-sm mb-2">This Month</p>
            <h2 className="text-4xl font-bold text-green-500">+{monthlyGain.toLocaleString()}</h2>
            <p className="text-sm text-muted-foreground mt-1">From achievements & rewards</p>
          </Card>
          
          <Card className="glass-card p-8">
            <Vault className="w-10 h-10 text-primary mb-4" />
            <p className="text-muted-foreground text-sm mb-2">Total XP</p>
            <h2 className="text-4xl font-bold text-foreground">{xpPoints.toLocaleString()}</h2>
            <p className="text-sm text-muted-foreground mt-1">Experience points earned</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Button 
            className="h-16 text-lg"
            onClick={() => navigate("/blackcoin?action=deposit")}
          >
            <ArrowDownRight className="w-5 h-5 mr-2" />
            Deposit Funds
          </Button>
          <Button 
            variant="outline" 
            className="h-16 text-lg"
            onClick={() => navigate("/blackcoin?action=withdraw")}
          >
            <ArrowUpRight className="w-5 h-5 mr-2" />
            Withdraw
          </Button>
          <Button 
            variant="outline" 
            className="h-16 text-lg"
            onClick={() => navigate("/blackcoin?action=convert")}
          >
            <History className="w-5 h-5 mr-2" />
            Convert
          </Button>
        </div>

        {/* Transaction History */}
        <Card className="glass-card p-8">
          <h2 className="text-2xl font-bold mb-6 gradient-text-wealth">Transaction History</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Complete achievements and activities to see your history</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const isPositive = transaction.amount > 0;
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-5 rounded-2xl bg-background/50 hover:bg-background/80 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isPositive ? (
                          <ArrowUpRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{transaction.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.date), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{transaction.amount}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{transaction.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BlackVault;