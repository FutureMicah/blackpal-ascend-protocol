import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Gem, Sparkles, Zap, Shield, Trophy, Star } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";

const BlackPass = () => {
  const tiers = [
    {
      name: "Silver",
      price: "$49",
      period: "/month",
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
      name: "Gold",
      price: "$99",
      period: "/month",
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
      name: "Diamond",
      price: "$199",
      period: "/month",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Premium background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        {[...Array(20)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-primary rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      <FloatingNav />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackPass</h1>
            <Sparkles className="w-8 h-8 text-gold animate-float" />
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
            Unlock exclusive trading tools, premium signals, and elite mentorship
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Instant Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>30-Day Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, idx) => {
            const IconComponent = tier.icon;
            return (
              <Card
                key={idx}
                className={`glass-strong p-8 border-primary/20 animate-slide-up relative overflow-hidden ${
                  tier.popular ? 'ring-2 ring-primary shadow-depth-xl scale-105' : ''
                }`}
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-cyber text-white px-4 py-1 text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}

                {/* Tier Icon & Name */}
                <div className="text-center mb-6">
                  <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${tier.color} mb-4 glow-cyan`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold gradient-text-cyber mb-2">{tier.name}</h3>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                    <span className="text-muted-foreground mb-1">{tier.period}</span>
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
                    tier.popular
                      ? 'bg-gradient-cyber hover:opacity-90 glow-cyan'
                      : 'bg-background/50 hover:bg-background/70 border border-primary/30'
                  } transition-all duration-300 hover:scale-[1.02]`}
                >
                  {tier.popular ? 'Start Free Trial' : 'Get Started'}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Additional Benefits Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center gradient-text-cyber mb-12 animate-fade-in">
            All Members Get Access To
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: "Live Trading Signals", desc: "Real-time alerts on high-probability setups" },
              { icon: Shield, title: "Risk Management", desc: "Advanced tools to protect your capital" },
              { icon: Trophy, title: "Performance Tracking", desc: "Detailed analytics on all your trades" },
              { icon: Star, title: "Community Support", desc: "Connect with 2,500+ elite traders" },
            ].map((benefit, idx) => (
              <Card
                key={idx}
                className="glass-strong p-6 border-primary/20 animate-slide-up hover:border-primary/40 transition-all"
                style={{ animationDelay: `${0.8 + 0.1 * idx}s` }}
              >
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
