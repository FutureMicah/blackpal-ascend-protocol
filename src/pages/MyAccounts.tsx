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
import { motion } from "framer-motion";
import {
  Loader2, Trophy, Shield, TrendingUp, Lock, Unlock,
  Star, Target, Zap, ChevronRight, Plus, Wallet, Award
} from "lucide-react";

interface XpTier {
  id: string; tier_level: number; tier_name: string; account_size_naira: number;
  max_accounts: number; xp_required: number; profit_target_percent: number;
  max_drawdown_percent: number; daily_loss_limit_percent: number;
  profit_split_percent: number; badge_icon: string;
}

interface TraderAccount {
  id: string; account_name: string; account_size_naira: number; tier_level: number;
  status: string; xp_earned: number; xp_required_next: number; payout_count: number;
  total_payout_naira: number; win_rate: number; total_trades: number;
  current_balance: number; highest_balance: number; profit_target_percent: number;
  max_drawdown_percent: number; daily_loss_limit_percent: number;
  is_first_account: boolean; created_at: string;
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

  useEffect(() => { init(); }, []);

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
    const activeAccounts = accounts.filter(a => a.status === "active");
    if (activeAccounts.length >= currentTier.max_accounts) {
      toast.error(`Max ${currentTier.max_accounts} active accounts at Tier ${currentTierLevel}`);
      setRequesting(false); return;
    }
    const { error } = await supabase.from("account_requests").insert({
      user_id: userId, requested_tier: currentTierLevel,
      requested_size_naira: currentTier.account_size_naira, user_xp: userXp,
    });
    if (error) { toast.error("Failed to submit request"); }
    else {
      if (requestMessage.trim()) {
        await supabase.from("support_tickets").insert({
          user_id: userId, subject: `Account Request - Tier ${currentTierLevel}`,
          message: requestMessage, category: "account_request", priority: "high",
        });
      }
      toast.success("Account request submitted!");
      setShowRequest(false); setRequestMessage("");
    }
    setRequesting(false);
  };

  const currentTier = tiers.find(t => t.tier_level === currentTierLevel);
  const nextTier = tiers.find(t => t.tier_level === currentTierLevel + 1);
  const xpProgress = nextTier ? Math.min((userXp / nextTier.xp_required) * 100, 100) : 100;
  const activeAccounts = accounts.filter(a => a.status === "active");
  const canRequestMore = currentTier ? activeAccounts.length < currentTier.max_accounts : false;

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Trading Accounts</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage accounts & track XP progression</p>
        </motion.div>

        {/* XP & Tier Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-5 rounded-xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xl">{currentTier?.badge_icon || "🥉"}</span>
                <div>
                  <h2 className="text-base font-bold">{currentTier?.tier_name || "Starter"}</h2>
                  <p className="text-[10px] text-muted-foreground">Level {currentTierLevel}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-primary" /> {userXp} XP</span>
                <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {activeAccounts.length}/{currentTier?.max_accounts || 1}</span>
                <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-yellow-500" /> {accounts.reduce((s, a) => s + a.payout_count, 0)} Payouts</span>
              </div>
            </div>
            {nextTier && (
              <div className="min-w-0 sm:min-w-[200px]">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground truncate">Next: {nextTier.badge_icon} {nextTier.tier_name}</span>
                  <span className="font-mono shrink-0">{userXp}/{nextTier.xp_required}</span>
                </div>
                <Progress value={xpProgress} className="h-1.5" />
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {nextTier.xp_required - userXp} XP to unlock ₦{nextTier.account_size_naira.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tier Progression */}
        <div className="mb-5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tier Progression</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {tiers.map((t) => {
              const unlocked = userXp >= t.xp_required;
              const isCurrent = t.tier_level === currentTierLevel;
              return (
                <div key={t.id} className={`rounded-lg border p-2 text-center min-w-[80px] shrink-0 ${
                  isCurrent ? "border-primary bg-primary/10 shadow-md shadow-primary/20" :
                  unlocked ? "border-green-500/30 bg-green-500/5" : "border-border bg-card/30 opacity-50"
                }`}>
                  <span className="text-lg">{t.badge_icon}</span>
                  <p className="text-[9px] font-bold mt-0.5">{t.tier_name}</p>
                  <p className="text-[8px] text-muted-foreground">₦{(t.account_size_naira / 1000).toFixed(0)}K</p>
                  <p className="text-[8px] text-muted-foreground">{t.profit_split_percent}% split</p>
                  {unlocked ? (
                    <Badge variant="outline" className="text-[7px] mt-0.5 border-green-500 text-green-500 px-1 py-0"><Unlock className="w-2.5 h-2.5 mr-0.5" />OK</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[7px] mt-0.5 px-1 py-0"><Lock className="w-2.5 h-2.5 mr-0.5" />{t.xp_required}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Accounts */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Your Accounts</h3>
            {canRequestMore && (
              <Button size="sm" onClick={() => setShowRequest(true)} className="h-7 text-[10px] gap-1">
                <Plus className="w-3 h-3" /> Request
              </Button>
            )}
          </div>

          {accounts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Wallet className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold mb-0.5">No accounts yet</h3>
                <p className="text-xs text-muted-foreground mb-3">Request your first ₦200K trading account</p>
                <Button size="sm" onClick={() => setShowRequest(true)}><Plus className="w-3 h-3 mr-1" /> Request Account</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map((account, i) => {
                const pnl = account.current_balance - account.account_size_naira;
                const pnlPercent = (pnl / account.account_size_naira) * 100;
                const drawdown = ((account.highest_balance - account.current_balance) / account.highest_balance) * 100;
                const t = tiers.find(x => x.tier_level === account.tier_level);
                return (
                  <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className={`overflow-hidden ${account.status === "active" ? "border-primary/30" : "opacity-50"}`}>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-lg shrink-0">{t?.badge_icon || "🥉"}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs truncate">{account.account_name}</p>
                              <p className="text-[9px] text-muted-foreground">{t?.tier_name} • ₦{(account.account_size_naira / 1000).toFixed(0)}K</p>
                            </div>
                          </div>
                          <Badge variant={account.status === "active" ? "default" : "secondary"} className="text-[8px] shrink-0">{account.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="text-center p-1.5 rounded-md bg-muted/30">
                            <p className="text-[8px] text-muted-foreground">Balance</p>
                            <p className="text-[11px] font-bold font-mono">₦{(account.current_balance / 1000).toFixed(0)}K</p>
                          </div>
                          <div className="text-center p-1.5 rounded-md bg-muted/30">
                            <p className="text-[8px] text-muted-foreground">P&L</p>
                            <p className={`text-[11px] font-bold font-mono ${pnl >= 0 ? "text-green-500" : "text-destructive"}`}>
                              {pnl >= 0 ? "+" : ""}₦{(pnl / 1000).toFixed(1)}K
                            </p>
                          </div>
                          <div className="text-center p-1.5 rounded-md bg-muted/30">
                            <p className="text-[8px] text-muted-foreground">Win Rate</p>
                            <p className="text-[11px] font-bold font-mono">{account.win_rate}%</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <div className="flex justify-between text-[8px] mb-0.5">
                              <span className="text-muted-foreground">Target ({account.profit_target_percent}%)</span>
                              <span className="text-primary">{Math.max(0, pnlPercent).toFixed(1)}%</span>
                            </div>
                            <Progress value={Math.min(Math.max(0, (pnlPercent / account.profit_target_percent) * 100), 100)} className="h-1" />
                          </div>
                          <div>
                            <div className="flex justify-between text-[8px] mb-0.5">
                              <span className="text-muted-foreground">DD ({account.max_drawdown_percent}%)</span>
                              <span className={drawdown > account.max_drawdown_percent * 0.8 ? "text-destructive" : "text-green-500"}>{drawdown.toFixed(1)}%</span>
                            </div>
                            <Progress value={Math.min((drawdown / account.max_drawdown_percent) * 100, 100)} className="h-1" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                            <span>{account.total_trades} trades</span>
                            <span>{account.payout_count} payouts</span>
                            <span>+{account.xp_earned} XP</span>
                          </div>
                          {account.status === "active" && (
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" onClick={() => navigate("/cinematic-access")}>
                              Trade <ChevronRight className="w-2.5 h-2.5 ml-0.5" />
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
          <CardContent className="p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> How XP Works
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Target, label: "Hit Target", xp: "+5 XP", desc: "Complete a phase" },
                { icon: Shield, label: "No Violations", xp: "+2 XP", desc: "10 days clean" },
                { icon: Award, label: "Payout", xp: "+5 XP", desc: "Receive payout" },
                { icon: Star, label: "Win Streak", xp: "+1 XP", desc: "5 wins in a row" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20">
                  <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium">{item.label}</p>
                    <p className="text-primary font-bold text-[10px]">{item.xp}</p>
                    <p className="text-[8px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent className="max-w-[340px] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Request Trading Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 space-y-1.5 text-xs">
              <div className="flex justify-between"><span>Tier</span><span className="font-bold">{currentTier?.badge_icon} {currentTier?.tier_name}</span></div>
              <div className="flex justify-between"><span>Size</span><span className="font-bold">₦{currentTier?.account_size_naira.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Split</span><span className="font-bold">{currentTier?.profit_split_percent}%</span></div>
              <div className="flex justify-between"><span>Slots</span><span className="font-bold">{activeAccounts.length}/{currentTier?.max_accounts}</span></div>
            </div>
            <Textarea placeholder="Message to admin (optional)..." value={requestMessage} onChange={e => setRequestMessage(e.target.value)} rows={2} className="text-xs" />
            <Button onClick={requestAccount} disabled={requesting} className="w-full h-9 text-xs">
              {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
