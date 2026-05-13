import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingNav } from "@/components/FloatingNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vault, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Transaction {
  id: string; type: string; amount: number; date: string; status: string;
}

const BlackVault = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [xpPoints, setXpPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      await loadData(user.id);
    };
    init();
  }, [navigate]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("virtual_currency, xp_points").eq("id", userId).single();
      if (profile) { setBalance(profile.virtual_currency || 0); setXpPoints(profile.xp_points || 0); }

      const { data: paymentData } = await supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);

      const txns: Transaction[] = [];
      paymentData?.forEach(p => txns.push({ id: p.id, type: `${p.payment_tier} Payment`, amount: -p.amount_usd, date: p.created_at, status: p.payment_status || "pending" }));
      setTransactions(txns);
    } catch (error) {
      console.error("Error loading vault data:", error);
    } finally {
      setLoading(false);
    }
  };

  // No fake derived numbers — only what's actually stored.

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        <header className="mb-5">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Vault className="w-5 h-5 sm:w-7 sm:h-7" />
            BlackVault
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your financial command center</p>
        </header>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-5">
          <Card className="p-3 sm:p-5">
            <DollarSign className="w-5 h-5 text-primary mb-1" />
            <p className="text-[9px] text-muted-foreground">BTAX Balance</p>
            <h2 className="text-sm sm:text-xl font-bold font-mono">{balance.toLocaleString()}</h2>
            <p className="text-[8px] text-muted-foreground">Set by admin</p>
          </Card>
          <Card className="p-3 sm:p-5">
            <Vault className="w-5 h-5 text-primary mb-1" />
            <p className="text-[9px] text-muted-foreground">Total XP</p>
            <h2 className="text-sm sm:text-xl font-bold font-mono">{xpPoints.toLocaleString()}</h2>
            <p className="text-[8px] text-muted-foreground">Earned</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Button className="h-9 text-xs" onClick={() => navigate("/wallet/topup")}>
            <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Deposit ₦
          </Button>
          <Button variant="outline" className="h-9 text-xs" onClick={() => navigate("/blackcoin?action=withdraw")}>
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Withdraw
          </Button>
          <Button variant="outline" className="h-9 text-xs" onClick={() => navigate("/blackcoin?action=convert")}>
            <History className="w-3.5 h-3.5 mr-1" /> Convert
          </Button>
        </div>

        {/* Transaction History */}
        <Card className="p-3 sm:p-5">
          <h2 className="text-sm font-bold mb-3">Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 text-green-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{tx.type}</p>
                        <p className="text-[9px] text-muted-foreground">{format(new Date(tx.date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-[8px] text-muted-foreground capitalize">{tx.status}</p>
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
