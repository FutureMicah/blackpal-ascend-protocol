import { useEffect, useState } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, TrendingUp, Share2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Referrals() {
  const [user, setUser] = useState<any>(null);
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, xpEarned: 0 });
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Get or create referral code
      const { data: codes } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      if (codes && codes.length > 0) {
        setReferralCode(codes[0].code);
      }

      // Get referral stats from friend_connections (users who joined via referral)
      const { data: refs } = await supabase
        .from("friend_connections")
        .select("*, profiles:friend_id(display_name, avatar_url)")
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (refs) {
        setReferrals(refs);
        setStats({
          total: refs.length,
          active: refs.length,
          xpEarned: refs.length * 2,
        });
      }
    };
    load();
  }, []);

  const shortLink = referralCode ? `${window.location.origin}/r/${referralCode}` : "";

  const copyCode = () => {
    if (!shortLink) return;
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    if (!shortLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join BlackPal", text: "Join me on BlackPal — the ultimate trading platform!", url: shortLink });
    } else {
      copyCode();
    }
  };

  const tiers = [
    { min: 0, label: "Starter", reward: "+1 XP per referral", color: "from-zinc-600 to-zinc-700" },
    { min: 5, label: "Recruiter", reward: "+2 XP per referral", color: "from-blue-600 to-blue-700" },
    { min: 15, label: "Ambassador", reward: "+3 XP + Badge", color: "from-purple-600 to-purple-700" },
    { min: 50, label: "Elite", reward: "+5 XP + Exclusive Title", color: "from-amber-500 to-amber-600" },
  ];

  const currentTier = tiers.filter(t => stats.total >= t.min).pop() || tiers[0];
  const nextTier = tiers.find(t => stats.total < t.min);

  return (
    <div className="min-h-screen bg-background text-foreground rebrand-portfolio">
      <FloatingNav />
      <div className="pt-16 pb-20 px-3 max-w-4xl mx-auto space-y-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-lg font-bold">Referral Program</h1>
          <p className="text-[10px] text-muted-foreground">Invite friends, earn XP & unlock rewards</p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Referrals", value: stats.total, icon: Users, color: "text-blue-400" },
            { label: "Active Users", value: stats.active, icon: TrendingUp, color: "text-green-400" },
            { label: "XP Earned", value: stats.xpEarned, icon: Gift, color: "text-amber-400" },
          ].map((s, i) => (
            <Card key={i} className="p-2.5 bg-card/50 border-border/30">
              <s.icon className={`w-3.5 h-3.5 ${s.color} mb-1`} />
              <p className="text-base font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Referral Link */}
        <Card className="p-3 bg-card/50 border-border/30">
          <p className="text-[10px] font-medium mb-2">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/30 rounded-lg px-3 py-2 text-[10px] font-mono truncate border border-border/30">
              {shortLink || "Loading..."}
            </div>
            <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1" onClick={copyCode}>
              {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" className="h-8 text-[10px] gap-1" onClick={shareCode}>
              <Share2 className="w-3 h-3" /> Share
            </Button>
          </div>
        </Card>

        {/* Tier Progress */}
        <Card className="p-3 bg-card/50 border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-medium">Current Tier</p>
              <p className={`text-xs font-bold bg-gradient-to-r ${currentTier.color} bg-clip-text text-transparent`}>
                {currentTier.label}
              </p>
            </div>
            {nextTier && (
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground">Next: {nextTier.label}</p>
                <p className="text-[9px] text-muted-foreground">{nextTier.min - stats.total} more referrals</p>
              </div>
            )}
          </div>
          <div className="w-full bg-muted/30 rounded-full h-1.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${currentTier.color} transition-all`}
              style={{ width: nextTier ? `${((stats.total - (currentTier.min)) / (nextTier.min - currentTier.min)) * 100}%` : "100%" }}
            />
          </div>
          <div className="flex gap-1.5 mt-3">
            {tiers.map((t, i) => (
              <div key={i} className={`flex-1 text-center p-1.5 rounded-lg border text-[8px] ${stats.total >= t.min ? `bg-gradient-to-r ${t.color} text-white border-transparent` : "border-border/30 text-muted-foreground"}`}>
                <p className="font-bold">{t.label}</p>
                <p className="opacity-80">{t.reward}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Referrals */}
        <Card className="p-3 bg-card/50 border-border/30">
          <p className="text-[10px] font-medium mb-2">Recent Referrals</p>
          {referrals.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {referrals.slice(0, 10).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/20">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold">
                    {((r.profiles as any)?.display_name || "U")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate">{(r.profiles as any)?.display_name || "User"}</p>
                    <p className="text-[8px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[9px] text-green-400 font-medium">+2 XP</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
