import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Gift, Trophy, Star } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";

const BlackCoin = () => {
  const transactions = [
    { type: "earn", amount: "+500", desc: "Weekly streak bonus", time: "2h ago" },
    { type: "spend", amount: "-200", desc: "Premium indicator unlock", time: "1d ago" },
    { type: "earn", amount: "+1000", desc: "Challenge completion", time: "2d ago" },
    { type: "earn", amount: "+300", desc: "Daily login reward", time: "3d ago" },
  ];

  const rewards = [
    { name: "Premium Strategy Pack", cost: 5000, icon: Trophy, category: "Tools" },
    { name: "1-Month BlackPass Gold", cost: 8000, icon: Star, category: "Membership" },
    { name: "Exclusive Trading Indicator", cost: 3000, icon: Zap, category: "Tools" },
    { name: "Personal Mentorship Hour", cost: 10000, icon: Gift, category: "Education" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Coin-themed background */}
      <div className="absolute inset-0 -z-10">
        {[...Array(25)].map((_, i) => (
          <div
            key={`coin-${i}`}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          >
            <Coins
              className="text-gold opacity-10"
              style={{ width: `${20 + Math.random() * 40}px` }}
            />
          </div>
        ))}
      </div>

      <FloatingNav />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Coins className="w-10 h-10 text-gold animate-pulse" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackCoin</h1>
            <Gift className="w-8 h-8 text-primary animate-float" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn rewards for your trading excellence and unlock exclusive benefits
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Card */}
            <Card className="glass-strong p-8 border-primary/20 animate-slide-up relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gold/20 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Coins className="w-5 h-5" />
                  <span className="text-sm font-medium">Your Balance</span>
                </div>
                <div className="flex items-end gap-3 mb-6">
                  <h2 className="text-6xl font-bold gradient-text-cyber">12,847</h2>
                  <Badge className="mb-2 bg-green-500/20 text-green-500 border-green-500/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +23%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background/30">
                    <div className="text-sm text-muted-foreground mb-1">This Week</div>
                    <div className="text-2xl font-bold text-green-500">+1,240</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/30">
                    <div className="text-sm text-muted-foreground mb-1">This Month</div>
                    <div className="text-2xl font-bold text-green-500">+4,567</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/30">
                    <div className="text-sm text-muted-foreground mb-1">All Time</div>
                    <div className="text-2xl font-bold text-foreground">28,493</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Earning Opportunities */}
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-2xl font-bold gradient-text-cyber mb-6">Earn More Coins</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Daily Login", coins: 100, icon: Star, color: "text-yellow-500" },
                  { title: "Complete 5 Trades", coins: 500, icon: TrendingUp, color: "text-green-500" },
                  { title: "Weekly Streak", coins: 1000, icon: Zap, color: "text-blue-500" },
                  { title: "Refer a Friend", coins: 2000, icon: Gift, color: "text-purple-500" },
                ].map((opportunity, idx) => (
                  <Card
                    key={idx}
                    className="p-4 bg-background/30 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <opportunity.icon className={`w-8 h-8 ${opportunity.color}`} />
                      <div className="flex-1">
                        <h3 className="font-semibold">{opportunity.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Coins className="w-3 h-3 text-gold" />
                          <span className="font-bold text-gold">+{opportunity.coins}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Claim
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Transaction History */}
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-2xl font-bold gradient-text-cyber mb-6">Recent Activity</h2>
              <div className="space-y-3">
                {transactions.map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-lg bg-background/30 hover:bg-background/50 transition-all"
                  >
                    <div className={`p-2 rounded-full ${tx.type === 'earn' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {tx.type === 'earn' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{tx.desc}</div>
                      <div className="text-sm text-muted-foreground">{tx.time}</div>
                    </div>
                    <div className={`font-bold ${tx.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Rewards Shop */}
          <div className="space-y-6">
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-xl font-bold gradient-text-cyber mb-6">Rewards Shop</h2>
              <div className="space-y-4">
                {rewards.map((reward, idx) => (
                  <Card
                    key={idx}
                    className="p-4 bg-background/30 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <reward.icon className="w-6 h-6 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2 text-xs">
                          {reward.category}
                        </Badge>
                        <h3 className="font-semibold text-sm mb-1">{reward.name}</h3>
                        <div className="flex items-center gap-1 text-sm">
                          <Coins className="w-3 h-3 text-gold" />
                          <span className="font-bold text-gold">{reward.cost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-cyber hover:opacity-90 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Redeem
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackCoin;
