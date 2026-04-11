import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Gem, Sparkles, Zap, Shield, Trophy, Star, Loader2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BlackPass = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const tiers = [
    { id: "silver", name: "Silver", price: 4900, priceDisplay: "4,900 BTC", icon: Star, color: "from-gray-400 to-gray-600", features: ["Basic trading signals", "Community forum", "Weekly analysis", "Email support", "Basic charting"] },
    { id: "gold", name: "Gold", price: 9900, priceDisplay: "9,900 BTC", icon: Gem, color: "from-yellow-500 to-yellow-600", popular: true, features: ["All Silver features", "Advanced signals", "Daily insights", "Priority support", "Advanced charting", "Custom indicators"] },
    { id: "diamond", name: "Diamond", price: 19900, priceDisplay: "19,900 BTC", icon: Crown, color: "from-cyan-400 to-blue-600", features: ["All Gold features", "Real-time alerts", "1-on-1 mentorship", "VIP community", "Custom strategies", "Portfolio analytics", "API access"] },
  ];

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);
      await loadCurrentTier(user.id);
    };
    init();
  }, [navigate]);

  const loadCurrentTier = async (uid: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("citizenship_rank").eq("id", uid).single();
      setCurrentTier(profile?.citizenship_rank || null);
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  };

  const purchaseTier = async (tierId: string, price: number) => {
    if (!userId) return;
    setPurchasing(tierId);
    try {
      const { data: profile } = await supabase.from("profiles").select("virtual_currency").eq("id", userId).single();
      const balance = profile?.virtual_currency || 0;
      if (balance < price) {
        toast({ variant: "destructive", title: "Insufficient balance", description: `Need ${price.toLocaleString()} BTC` });
        navigate("/blackcoin?action=deposit"); return;
      }
      const { error } = await supabase.from("profiles").update({ virtual_currency: balance - price, citizenship_rank: tierId }).eq("id", userId);
      if (error) throw error;
      await supabase.from("friend_activities").insert({ user_id: userId, activity_type: "tier_upgrade", activity_data: { tier: tierId, price } });
      toast({ title: "Upgrade successful!", description: `You are now ${tierId.charAt(0).toUpperCase() + tierId.slice(1)}!` });
      setCurrentTier(tierId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally { setPurchasing(null); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold">BlackPass</h1>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">Unlock exclusive trading tools & mentorship</p>
          {currentTier && (
            <Badge className="mt-2 text-[10px] px-2 py-0.5 bg-primary/20 text-primary">
              Current: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {tiers.map((tier) => {
            const IconComponent = tier.icon;
            const isCurrentTier = currentTier === tier.id;
            const tierIndex = tiers.findIndex(t => t.id === tier.id);
            const currentTierIndex = currentTier ? tiers.findIndex(t => t.id === currentTier) : -1;
            const isUpgrade = tierIndex > currentTierIndex;
            return (
              <Card key={tier.id} className={`p-3 sm:p-5 relative overflow-hidden ${tier.popular ? 'ring-1 ring-primary' : ''} ${isCurrentTier ? 'ring-1 ring-green-500' : ''}`}>
                {tier.popular && <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-0.5 text-[8px] font-bold">POPULAR</div>}
                {isCurrentTier && <div className="absolute top-0 left-0 bg-green-500 text-white px-2 py-0.5 text-[8px] font-bold">CURRENT</div>}
                <div className="text-center mb-3">
                  <div className={`inline-flex p-2 rounded-full bg-gradient-to-br ${tier.color} mb-2`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">{tier.name}</h3>
                  <span className="text-lg font-bold">{tier.priceDisplay}</span>
                </div>
                <ul className="space-y-1.5 mb-3">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px]">
                      <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-8 text-xs font-semibold ${isCurrentTier ? 'bg-green-500/20 text-green-500' : tier.popular ? '' : 'bg-muted/50 border border-primary/30'}`}
                  variant={tier.popular ? "default" : "outline"}
                  disabled={isCurrentTier || purchasing === tier.id || !isUpgrade}
                  onClick={() => purchaseTier(tier.id, tier.price)}
                >
                  {purchasing === tier.id ? <Loader2 className="w-3 h-3 animate-spin" /> : isCurrentTier ? "Active" : !isUpgrade ? "Lower" : "Upgrade"}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Zap, title: "Live Signals", desc: "Real-time alerts" },
            { icon: Shield, title: "Risk Mgmt", desc: "Protect capital" },
            { icon: Trophy, title: "Tracking", desc: "Trade analytics" },
            { icon: Star, title: "Community", desc: "Elite traders" },
          ].map((b, i) => (
            <Card key={i} className="p-3">
              <b.icon className="w-5 h-5 text-primary mb-1" />
              <h3 className="text-[10px] font-bold">{b.title}</h3>
              <p className="text-[9px] text-muted-foreground">{b.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlackPass;
