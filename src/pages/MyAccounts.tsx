import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Trophy, Shield, TrendingUp, Lock, Unlock, BarChart3,
  Star, Target, Activity, Zap, ChevronRight, Clock, Plus, Wallet,
  ArrowUpRight, Crown, Award, MessageSquare
} from "lucide-react";

interface XpTier {
  id: string;
  tier_level: number;
  tier_name: string;
  account_size_naira: number;
  max_accounts: number;
  xp_required: number;
  profit_target_percent: number;
  max_drawdown_percent: number;
  daily_loss_limit_percent: number;
  profit_split_percent: number;
  badge_icon: string;
}

interface TraderAccount {
  id: string;
  account_name: string;
  account_size_naira: number;
  tier_level: number;
  status: string;
  xp_earned: number;
  xp_required_next: number;
  payout_count: number;
  total_payout_naira: number;
  win_rate: number;
  total_trades: number;
  current_balance: number;
  highest_balance: number;
  profit_target_percent: number;
  max_drawdown_percent: number;
  daily_loss_limit_percent: number;
  is_first_account: boolean;
  created_at: string;
}

export default function MyAccounts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TraderAccount[]>([]);
  const [tiers, setTiers] = useState<XpTier[]>([]);
  const [userXp, setUserXp] = useState(0);
  const [currentTierLevel, setCurrentTierLevel] = useState(1);
  const [showRequest, setShowRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    setUserId(user.id);

    const [tiersRes, accountsRes, profileRes] = await Promise.all([
      supabase.from("xp_tier_config").select("*").order("tier_level"),
      supabase.from("trader_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("xp_points").eq("id", user.id).single(),
    ]);

    setTiers((tiersRes.data || []) as any);
    setAccounts((accountsRes.data || []) as any);
    const xp = profileRes.data?.xp_points || 0;
    setUserXp(xp);

    // Determine current tier
    const sortedTiers = (tiersRes.data || []).sort((a: any, b: any) => b.tier_level - a.tier_level);
    const currentT = sortedTiers.find((t: any) => xp >= t.xp_required) || sortedTiers[sortedTiers.length - 1];
    if (currentT) setCurrentTierLevel((currentT as any).tier_level);

    setLoading(false);
  };

  const requestAccount = async () => {
    if (!userId) return;
    setRequesting(true);

    const currentTier = tiers.find(t => t.tier_level === currentTierLevel);
    if (!currentTier) { setRequesting(false); return; }

    // Check max accounts for this tier
    const activeAccounts = accounts.filter(a => a.status === "active");
    if (activeAccounts.length >= currentTier.max_accounts) {
      toast.error(`You can only have ${currentTier.max_accounts} active accounts at Tier ${currentTierLevel}`);
      setRequesting(false);
      return;
    }

    const { error } = await supabase.from("account_requests").insert({
      user_id: userId,
      requested_tier: currentTierLevel,
      requested_size_naira: currentTier.account_size_naira,
      user_xp: userXp,
    });

    if (error) {
      toast.error("Failed to submit request");
    } else {
      // Also create a support ticket
      if (requestMessage.trim()) {
        await supabase.from("support_tickets").insert({
          user_id: userId,
          subject: `Account Request - Tier ${currentTierLevel}`,
          message: requestMessage,
          category: "account_request",
          priority: "high",
        });
      }
      toast.success("Account request submitted! Admin will review shortly.");
      setShowRequest(false);
      setRequestMessage("");
    }
    setRequesting(false);
  };

  const currentTier = tiers.find(t => t.tier_level === currentTierLevel);
  const nextTier = tiers.find(t => t.tier_level === currentTierLevel + 1);
  const xpProgress = nextTier ? Math.min((userXp / nextTier.xp_required) * 100, 100) : 100;
  const activeAccounts = accounts.filter(a => a.status === "active");
  const canRequestMore = currentTier ? activeAccounts.length < currentTier.max_accounts : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Trading Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your accounts and track XP progression</p>
        </motion.div>

        {/* XP & Tier Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{currentTier?.badge_icon || "🥉"}</span>
                <div>
                  <h2 className="text-xl font-bold">{currentTier?.tier_name || "Starter"} Tier</h2>
                  <p className="text-sm text-muted-foreground">Level {currentTierLevel}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-primary" /> {userXp.toLocaleString()} XP</span>
                <span className="flex items-center gap-1"><Wallet className="w-4 h-4" /> {activeAccounts.length}/{currentTier?.max_accounts || 1} Accounts</span>
                <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-yellow-500" /> {accounts.reduce((s, a) => s + a.payout_count, 0)} Payouts</span>
              </div>
            </div>
            {nextTier && (
              <div className="min-w-[250px]">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Next: {nextTier.badge_icon} {nextTier.tier_name}</span>
                  <span className="font-mono">{userXp}/{nextTier.xp_required} XP</span>
                </div>
                <Progress value={xpProgress} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {nextTier.xp_required - userXp} XP needed • Unlocks ₦{nextTier.account_size_naira.toLocaleString()} accounts
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tier Progression Cards */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Tier Progression</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {tiers.map((tier) => {
              const unlocked = userXp >= tier.xp_required;
              const isCurrent = tier.tier_level === currentTierLevel;
              return (
                <motion.div key={tier.id} whileHover={{ scale: 1.02 }}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    isCurrent ? "border-primary bg-primary/10 shadow-lg shadow-primary/20" :
                    unlocked ? "border-green-500/30 bg-green-500/5" :
                    "border-border bg-card/30 opacity-60"
                  }`}
                >
                  <span className="text-2xl">{tier.badge_icon}</span>
                  <p className="text-xs font-bold mt-1">{tier.tier_name}</p>
                  <p className="text-[10px] text-muted-foreground">₦{tier.account_size_naira.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{tier.max_accounts} acct{tier.max_accounts > 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{tier.profit_split_percent}% split</p>
                  {unlocked ? (
                    <Badge variant="outline" className="text-[9px] mt-1 border-green-500 text-green-500">
                      <Unlock className="w-3 h-3 mr-0.5" /> Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] mt-1">
                      <Lock className="w-3 h-3 mr-0.5" /> {tier.xp_required} XP
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Active Accounts */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Accounts</h3>
            {canRequestMore && (
              <Button size="sm" onClick={() => setShowRequest(true)} className="gap-1">
                <Plus className="w-4 h-4" /> Request Account
              </Button>
            )}
          </div>

          {accounts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No accounts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Request your first ₦200,000 trading account</p>
                <Button onClick={() => setShowRequest(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Request Starter Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account, i) => {
                const pnl = account.current_balance - account.account_size_naira;
                const pnlPercent = (pnl / account.account_size_naira) * 100;
                const drawdown = ((account.highest_balance - account.current_balance) / account.highest_balance) * 100;
                const tier = tiers.find(t => t.tier_level === account.tier_level);

                return (
                  <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}>
                    <Card className={`overflow-hidden ${account.status === "active" ? "border-primary/30" : "border-border opacity-60"}`}>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{tier?.badge_icon || "🥉"}</span>
                            <div>
                              <p className="font-semibold text-sm">{account.account_name}</p>
                              <p className="text-[10px] text-muted-foreground">{tier?.tier_name} • ₦{account.account_size_naira.toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge variant={account.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {account.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">Balance</p>
                            <p className="text-sm font-bold font-mono">₦{account.current_balance.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">P&L</p>
                            <p className={`text-sm font-bold font-mono ${pnl >= 0 ? "text-green-500" : "text-destructive"}`}>
                              {pnl >= 0 ? "+" : ""}₦{pnl.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">Win Rate</p>
                            <p className="text-sm font-bold font-mono">{account.win_rate}%</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-muted-foreground">Profit Target ({account.profit_target_percent}%)</span>
                              <span className="text-primary">{Math.max(0, pnlPercent).toFixed(1)}%</span>
                            </div>
                            <Progress value={Math.min(Math.max(0, (pnlPercent / account.profit_target_percent) * 100), 100)} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="text-muted-foreground">Drawdown ({account.max_drawdown_percent}%)</span>
                              <span className={drawdown > account.max_drawdown_percent * 0.8 ? "text-destructive" : "text-green-500"}>
                                {drawdown.toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={Math.min((drawdown / account.max_drawdown_percent) * 100, 100)} className="h-1.5" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{account.total_trades} trades</span>
                            <span>{account.payout_count} payouts</span>
                            <span>+{account.xp_earned} XP</span>
                          </div>
                          {account.status === "active" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/cinematic-access")}>
                              Trade <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* How XP Works */}
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> How XP Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Target, label: "Hit Profit Target", xp: "+5 XP", desc: "Complete a challenge phase" },
                { icon: Shield, label: "Stay Within Drawdown", xp: "+2 XP", desc: "Trade 10 days without violation" },
                { icon: Award, label: "Receive Payout", xp: "+5 XP", desc: "Successfully receive a payout" },
                { icon: Star, label: "Win Streak", xp: "+1 XP", desc: "5 consecutive winning trades" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                  <item.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-primary font-bold text-sm">{item.xp}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Account Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Trading Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tier</span>
                <span className="font-bold">{currentTier?.badge_icon} {currentTier?.tier_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Account Size</span>
                <span className="font-bold">₦{currentTier?.account_size_naira.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Profit Split</span>
                <span className="font-bold">{currentTier?.profit_split_percent}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Accounts</span>
                <span className="font-bold">{activeAccounts.length}/{currentTier?.max_accounts}</span>
              </div>
            </div>
            <Textarea
              placeholder="Add a message to admin (optional)..."
              value={requestMessage}
              onChange={e => setRequestMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={requestAccount} disabled={requesting} className="w-full">
              {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
