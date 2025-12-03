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
    {
      id: "silver",
      name: "Silver",
      price: 4900,
      priceDisplay: "4,900 BTC",
      icon: Star,
      color: "from-gray-400 to-gray-600",
      features: [
        "Access to basic trading signals",
        "Community forum access",
        "Weekly market analysis",
        "Email support",
        "Basic charting tools",
      ],
    },
    {
      id: "gold",
      name: "Gold",
      price: 9900,
      priceDisplay: "9,900 BTC",
      icon: Gem,
      color: "from-gold to-yellow-600",
      popular: true,
      features: [
        "All Silver features",
        "Advanced trading signals",
        "Daily market insights",
        "Priority support",
        "Advanced charting suite",
        "Custom indicators",
        "Risk management tools",
      ],
    },
    {
      id: "diamond",
      name: "Diamond",
      price: 19900,
      priceDisplay: "19,900 BTC",
      icon: Crown,
      color: "from-cyan-400 to-blue-600",
      features: [
        "All Gold features",
        "Real-time trade alerts",
        "1-on-1 mentorship sessions",
        "VIP community access",
        "Custom strategy building",
        "Portfolio analytics",
        "API access",
        "White-glove support",
      ],
    },
  ];

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);
      await loadCurrentTier(user.id);
    };
    init();
  }, [navigate]);

  const loadCurrentTier = async (uid: string) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("citizenship_rank")
        .eq("id", uid)
        .single();

      setCurrentTier(profile?.citizenship_rank || null);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseTier = async (tierId: string, price: number) => {
    if (!userId) return;
    
    setPurchasing(tierId);
    try {
      // Check balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("virtual_currency")
        .eq("id", userId)
        .single();

      const balance = profile?.virtual_currency || 0;
      
      if (balance < price) {
        toast({
          variant: "destructive",
          title: "Insufficient balance",
          description: `You need ${price.toLocaleString()} BTC. Current balance: ${balance.toLocaleString()} BTC`,
        });
        navigate("/blackcoin?action=deposit");
        return;
      }

      // Deduct balance and upgrade tier
      const { error } = await supabase
        .from("profiles")
        .update({ 
          virtual_currency: balance - price,
          citizenship_rank: tierId
        })
        .eq("id", userId);

      if (error) throw error;

      // Post activity
      await supabase.from("friend_activities").insert({
        user_id: userId,
        activity_type: "tier_upgrade",
        activity_data: { tier: tierId, price }
      });

      toast({
        title: "Upgrade successful!",
        description: `You are now a ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} member!`,
      });

      setCurrentTier(tierId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setPurchasing(null);
    }
  };

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
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackPass</h1>
            <Sparkles className="w-8 h-8 text-gold" />
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Unlock exclusive trading tools, premium signals, and elite mentorship
          </p>
          {currentTier && (
            <Badge className="text-lg px-4 py-2 bg-primary/20 text-primary">
              Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const IconComponent = tier.icon;
            const isCurrentTier = currentTier === tier.id;
            const tierIndex = tiers.findIndex(t => t.id === tier.id);
            const currentTierIndex = currentTier ? tiers.findIndex(t => t.id === currentTier) : -1;
            const isUpgrade = tierIndex > currentTierIndex;
            
            return (
              <Card
                key={tier.id}
                className={`glass-card p-8 relative overflow-hidden ${
                  tier.popular ? 'ring-2 ring-primary shadow-lg scale-105' : ''
                } ${isCurrentTier ? 'ring-2 ring-green-500' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}
                {isCurrentTier && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 text-xs font-bold">
                    CURRENT PLAN
                  </div>
                )}

                {/* Tier Icon & Name */}
                <div className="text-center mb-6">
                  <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${tier.color} mb-4`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold gradient-text-cyber mb-2">{tier.name}</h3>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{tier.priceDisplay}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-sm">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full h-12 text-lg font-semibold ${
                    isCurrentTier 
                      ? 'bg-green-500/20 text-green-500 cursor-default'
                      : tier.popular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-background/50 hover:bg-background/70 border border-primary/30'
                  }`}
                  disabled={isCurrentTier || purchasing === tier.id || !isUpgrade}
                  onClick={() => purchaseTier(tier.id, tier.price)}
                >
                  {purchasing === tier.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentTier ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Active
                    </>
                  ) : !isUpgrade ? (
                    "Lower Tier"
                  ) : (
                    "Upgrade Now"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Additional Benefits */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center gradient-text-cyber mb-12">
            All Members Get Access To
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: "Live Trading Signals", desc: "Real-time alerts on high-probability setups" },
              { icon: Shield, title: "Risk Management", desc: "Advanced tools to protect your capital" },
              { icon: Trophy, title: "Performance Tracking", desc: "Detailed analytics on all your trades" },
              { icon: Star, title: "Community Support", desc: "Connect with elite traders worldwide" },
            ].map((benefit, idx) => (
              <Card key={idx} className="glass-card p-6">
                <benefit.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackPass;