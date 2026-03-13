import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Shield, TrendingUp, Lock, Unlock, BarChart3,
  Loader2, Star, Target, Activity, Zap, ChevronRight, Clock
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface PropTier {
  id: string;
  tier_name: string;
  tier_level: number;
  account_size: number;
  max_daily_loss_percent: number;
  max_total_drawdown_percent: number;
  profit_target_percent: number;
  profit_split_percent: number;
  min_trading_days: number;
  max_trading_days: number;
  badge_icon: string;
  description: string;
  required_passes: number;
}

interface PropAccount {
  id: string;
  tier_id: string;
  account_balance: number;
  starting_balance: number;
  current_equity: number;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  trading_days: number;
  status: string;
  phase: string;
  access_code: string;
  created_at: string;
}

interface PassHistory {
  id: string;
  tier_id: string;
  final_pnl_percent: number;
  total_trades: number;
  win_rate: number;
  passed_at: string;
}

export default function PropDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<PropTier[]>([]);
  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [passHistory, setPassHistory] = useState<PassHistory[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);

      const [tiersRes, accountsRes, historyRes] = await Promise.all([
        supabase.from("prop_tiers").select("*").order("tier_level"),
        supabase.from("user_prop_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("prop_pass_history").select("*").eq("user_id", user.id),
      ]);

      setTiers((tiersRes.data || []) as any);
      setAccounts((accountsRes.data || []) as any);
      setPassHistory((historyRes.data || []) as any);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const totalPasses = passHistory.length;

  const isTierUnlocked = (tier: PropTier) => totalPasses >= tier.required_passes;
  const isTierActive = (tier: PropTier) => accounts.some(a => a.tier_id === tier.id && a.status === "active");
  const isTierPassed = (tier: PropTier) => passHistory.some(h => h.tier_id === tier.id);

  const activeAccount = accounts.find(a => a.status === "active");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Prop Firm
            </h1>
          </div>
          {activeAccount && (
            <Button size="sm" onClick={() => navigate("/cinematic-access")} className="gap-1">
              <Zap className="w-4 h-4" /> Trade Now
            </Button>
          )}
        </div>
      </header>

      <main className="container px-4 py-6 space-y-8">
        {/* Trader Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Challenges Passed", value: totalPasses, icon: Trophy, color: "text-yellow-500" },
            { label: "Active Account", value: activeAccount ? "Yes" : "None", icon: Activity, color: "text-green-500" },
            { label: "Total Trades", value: accounts.reduce((s, a) => s + a.total_trades, 0), icon: BarChart3, color: "text-primary" },
            { label: "Best Win Rate", value: passHistory.length > 0 ? `${Math.max(...passHistory.map(h => h.win_rate)).toFixed(0)}%` : "—", icon: Target, color: "text-secondary" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-xl border border-border bg-card/50"
            >
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Active Account Card */}
        {activeAccount && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-primary/30 bg-primary/5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {tiers.find(t => t.id === activeAccount.tier_id)?.badge_icon}
                  {tiers.find(t => t.id === activeAccount.tier_id)?.tier_name} Challenge
                </h3>
                <Badge variant="outline" className="mt-1">{activeAccount.phase}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/cinematic-access")}>
                <Zap className="w-4 h-4 mr-1" /> Open Terminal
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Balance</p><p className="font-mono font-bold">${activeAccount.account_balance.toFixed(2)}</p></div>
              <div><p className="text-muted-foreground text-xs">P&L</p><p className={`font-mono font-bold ${activeAccount.total_pnl >= 0 ? "text-green-500" : "text-destructive"}`}>{activeAccount.total_pnl >= 0 ? "+" : ""}${activeAccount.total_pnl.toFixed(2)}</p></div>
              <div><p className="text-muted-foreground text-xs">Trades</p><p className="font-mono font-bold">{activeAccount.total_trades}</p></div>
              <div><p className="text-muted-foreground text-xs">Days</p><p className="font-mono font-bold">{activeAccount.trading_days}</p></div>
            </div>
          </motion.div>
        )}

        {/* Tier Progression */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" /> Prop Account Tiers
          </h2>
          <div className="space-y-3">
            {tiers.map((tier, i) => {
              const unlocked = isTierUnlocked(tier);
              const active = isTierActive(tier);
              const passed = isTierPassed(tier);

              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`p-4 rounded-xl border transition-all ${
                    active ? "border-primary/50 bg-primary/5" :
                    passed ? "border-green-500/30 bg-green-500/5" :
                    unlocked ? "border-border bg-card/50 hover:border-primary/30" :
                    "border-border/50 bg-card/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{tier.badge_icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{tier.tier_name}</h3>
                        {passed && <Badge className="bg-green-600 text-white text-[9px]">PASSED</Badge>}
                        {active && <Badge className="bg-primary text-primary-foreground text-[9px]">ACTIVE</Badge>}
                        {!unlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{tier.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">${tier.account_size.toLocaleString()}</span>
                        <span>Target: {tier.profit_target_percent}%</span>
                        <span>Split: {tier.profit_split_percent}%</span>
                        <span>Max DD: {tier.max_total_drawdown_percent}%</span>
                      </div>
                    </div>
                    <div>
                      {unlocked && !active && !passed && (
                        <Badge variant="outline" className="text-[10px]">
                          <Unlock className="w-3 h-3 mr-1" /> Available
                        </Badge>
                      )}
                      {!unlocked && (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Requires</p>
                          <p className="text-xs font-bold">{tier.required_passes} passes</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Pass History */}
        {passHistory.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Pass History
            </h2>
            <div className="space-y-2">
              {passHistory.map(h => {
                const tier = tiers.find(t => t.id === h.tier_id);
                return (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{tier?.badge_icon}</span>
                      <div>
                        <p className="text-sm font-medium">{tier?.tier_name}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(h.passed_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-green-500">+{h.final_pnl_percent.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">{h.win_rate.toFixed(0)}% WR</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
