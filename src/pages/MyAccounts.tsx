import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Package, Plus, Wallet, ChevronRight, ShieldCheck, Target, TrendingDown, Percent } from "lucide-react";

interface Package {
  id: string;
  tier_level: number;
  tier_name: string;
  account_size_naira: number;
  max_accounts: number;
  profit_target_percent: number;
  max_drawdown_percent: number;
  daily_loss_limit_percent: number;
  profit_split_percent: number;
  payout_naira: number;
  rules_description: string | null;
  badge_icon: string | null;
  is_active: boolean;
}

interface Req {
  id: string;
  requested_tier: number;
  requested_size_naira: number;
  status: string;
  rejection_reason: string | null;
  package_id: string | null;
  created_at: string;
}

export default function MyAccounts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [liveAccounts, setLiveAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Package | null>(null);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }
    setUserId(user.id);
    const [pkgRes, reqRes, acctRes] = await Promise.all([
      supabase.from("xp_tier_config").select("*").eq("is_active", true).order("tier_level"),
      supabase.from("account_requests").select("id,requested_tier,requested_size_naira,status,rejection_reason,package_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_prop_accounts").select("*, prop_tiers(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setPackages((pkgRes.data || []) as any);
    setRequests((reqRes.data || []) as any);
    setLiveAccounts((acctRes.data || []) as any);
    setLoading(false);

    const ch = supabase.channel(`my-accts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_prop_accounts", filter: `user_id=eq.${user.id}` },
        async () => {
          const { data } = await supabase.from("user_prop_accounts").select("*, prop_tiers(*)").eq("user_id", user.id).order("created_at", { ascending: false });
          setLiveAccounts((data || []) as any);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  };

  const pendingForPackage = (pkgId: string) =>
    requests.find(r => r.package_id === pkgId && (r.status === "pending" || r.status === "approved"));

  const submitRequest = async () => {
    if (!userId || !selected || !agreed) return;
    setRequesting(true);
    const { error } = await supabase.from("account_requests").insert({
      user_id: userId,
      requested_tier: selected.tier_level,
      requested_size_naira: selected.account_size_naira,
      package_id: selected.id,
      user_xp: 0,
    } as any);
    if (error) toast.error(error.message);
    else {
      if (message.trim()) {
        await supabase.from("support_tickets").insert({
          user_id: userId,
          subject: `Account Request — ${selected.tier_name}`,
          message,
          category: "account_request",
          priority: "high",
        });
      }
      toast.success("Request sent — admin will review shortly");
      setSelected(null); setMessage(""); setAgreed(false);
      init();
    }
    setRequesting(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-16 sm:py-24">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Trading Account Portfolio</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Browse the packages our admins have published. Tap any package to read the rules and payout, then send a request.</p>
        </motion.div>

        {/* My requests */}
        {requests.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">My requests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {requests.slice(0, 6).map(r => {
                const variant = r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : r.status === "fulfilled" ? "outline" : "secondary";
                return (
                  <Card key={r.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">Tier {r.requested_tier} • ₦{Number(r.requested_size_naira).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                        </div>
                        <Badge variant={variant as any} className="text-[9px] capitalize">{r.status}</Badge>
                      </div>
                      {r.status === "rejected" && r.rejection_reason && (
                        <p className="text-[10px] text-destructive mt-1.5">Reason: {r.rejection_reason}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Packages */}
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Available packages</h3>
        {packages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold mb-0.5">No packages available yet</h3>
              <p className="text-xs text-muted-foreground">Check back soon — admins are preparing new trading accounts.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(p)}
                className="text-left"
              >
                <Card className="border-border hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{p.badge_icon || "🏆"}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{p.tier_name}</p>
                          <p className="text-[10px] text-muted-foreground">Tier {p.tier_level}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-1.5 rounded bg-muted/30">
                        <p className="text-muted-foreground">Size</p>
                        <p className="font-mono font-bold">₦{p.account_size_naira.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded bg-muted/30">
                        <p className="text-muted-foreground">Payout</p>
                        <p className="font-mono font-bold">₦{p.payout_naira.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Details + request dialog */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setAgreed(false); setMessage(""); } }}>
        <DialogContent className="max-w-[360px] sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <span className="text-xl">{selected?.badge_icon || "🏆"}</span> {selected?.tier_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Wallet, label: "Account size", value: `₦${selected.account_size_naira.toLocaleString()}` },
                  { icon: ShieldCheck, label: "Your payout", value: `₦${selected.payout_naira.toLocaleString()}` },
                  { icon: Percent, label: "Profit split", value: `${selected.profit_split_percent}%` },
                  { icon: Target, label: "Profit target", value: `${selected.profit_target_percent}%` },
                  { icon: TrendingDown, label: "Max drawdown", value: `${selected.max_drawdown_percent}%` },
                  { icon: TrendingDown, label: "Daily loss", value: `${selected.daily_loss_limit_percent}%` },
                ].map(s => (
                  <div key={s.label} className="p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground"><s.icon className="w-3 h-3" /> {s.label}</div>
                    <p className="text-xs font-bold font-mono mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              {selected.rules_description && (
                <div className="p-3 rounded-lg border border-border bg-card/60">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rules</p>
                  <p className="text-xs whitespace-pre-line">{selected.rules_description}</p>
                </div>
              )}

              <Textarea
                placeholder="Optional note to admin..."
                rows={2}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="text-xs"
              />

              {selected && pendingForPackage(selected.id) ? (
                <div className="p-2 rounded-lg bg-muted/40 border border-border text-[10px] text-center text-muted-foreground">
                  You already have a {pendingForPackage(selected.id)?.status} request for this package.
                </div>
              ) : (
                <>
                  <label className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card/60 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-primary" />
                    <span className="text-[10px] text-muted-foreground leading-snug">
                      I have read the rules above and understand the profit target, drawdown and daily loss limits for this account.
                    </span>
                  </label>

                  <Button className="w-full h-9 text-xs" onClick={submitRequest} disabled={requesting || !agreed}>
                    {requesting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                    Confirm & request this account
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
