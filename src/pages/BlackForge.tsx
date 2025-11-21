import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hammer, Zap, TrendingUp, Target, Shield, Sparkles, Play, Save, Share2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";

const BlackForge = () => {
  const [strategyName, setStrategyName] = useState("");

  const templates = [
    { name: "Scalping Master", winRate: "76%", trades: 2847, icon: Zap, color: "from-yellow-400 to-orange-600" },
    { name: "Swing Trader Pro", winRate: "68%", trades: 1432, icon: TrendingUp, color: "from-blue-400 to-purple-600" },
    { name: "Breakout Hunter", winRate: "72%", trades: 923, icon: Target, color: "from-green-400 to-emerald-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Forge-themed background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,107,0,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        {[...Array(15)].map((_, i) => (
          <div
            key={`spark-${i}`}
            className="absolute w-2 h-2 bg-orange-500 rounded-full animate-pulse blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.3 + Math.random() * 0.3,
            }}
          />
        ))}
      </div>

      <FloatingNav />

      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Hammer className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackForge</h1>
            <Sparkles className="w-8 h-8 text-orange-500 animate-float" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Craft, test, and optimize your trading strategies with precision tools
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy Builder - Main Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up">
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="builder">Builder</TabsTrigger>
                  <TabsTrigger value="backtest">Backtest</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Strategy Name</Label>
                      <Input
                        placeholder="My Advanced Strategy"
                        value={strategyName}
                        onChange={(e) => setStrategyName(e.target.value)}
                        className="h-12 bg-background/50 border-primary/30"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Asset Class</Label>
                        <Select>
                          <SelectTrigger className="h-12 bg-background/50 border-primary/30">
                            <SelectValue placeholder="Select asset" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forex">Forex</SelectItem>
                            <SelectItem value="crypto">Crypto</SelectItem>
                            <SelectItem value="stocks">Stocks</SelectItem>
                            <SelectItem value="indices">Indices</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Timeframe</Label>
                        <Select>
                          <SelectTrigger className="h-12 bg-background/50 border-primary/30">
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1m">1 Minute</SelectItem>
                            <SelectItem value="5m">5 Minutes</SelectItem>
                            <SelectItem value="15m">15 Minutes</SelectItem>
                            <SelectItem value="1h">1 Hour</SelectItem>
                            <SelectItem value="4h">4 Hours</SelectItem>
                            <SelectItem value="1d">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Card className="p-4 bg-background/30 border-primary/20">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Entry Conditions
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-muted-foreground">RSI crosses above 30</span>
                          <Badge variant="outline">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                          <span className="text-muted-foreground">MACD bullish crossover</span>
                          <Badge variant="outline">Active</Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full mt-2 text-primary">
                          + Add Condition
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-4 bg-background/30 border-primary/20">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Risk Management
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Stop Loss</Label>
                          <Input placeholder="2%" className="h-10 bg-background/50 border-primary/30" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Take Profit</Label>
                          <Input placeholder="6%" className="h-10 bg-background/50 border-primary/30" />
                        </div>
                      </div>
                    </Card>

                    <div className="flex gap-3">
                      <Button className="flex-1 bg-gradient-cyber hover:opacity-90 glow-cyan">
                        <Play className="w-4 h-4 mr-2" />
                        Deploy Strategy
                      </Button>
                      <Button variant="outline" className="border-primary/30">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" className="border-primary/30">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="backtest">
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">Backtest Your Strategy</h3>
                    <p>Test your strategy against historical data to validate performance</p>
                  </div>
                </TabsContent>

                <TabsContent value="optimize">
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-2">AI Optimization</h3>
                    <p>Let AI fine-tune your strategy parameters for maximum performance</p>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Templates Sidebar */}
          <div className="space-y-6">
            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-xl font-bold gradient-text-cyber mb-6">Strategy Templates</h2>
              <div className="space-y-4">
                {templates.map((template, idx) => {
                  const IconComponent = template.icon;
                  return (
                    <Card
                      key={idx}
                      className="p-4 bg-background/30 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${template.color}`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-2">{template.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {template.winRate}
                            </span>
                            <span>{template.trades} trades</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Use Template
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </Card>

            <Card className="glass-strong p-6 border-primary/20 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="font-bold mb-4">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategies Created</span>
                  <span className="font-bold">24</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Win Rate</span>
                  <span className="font-bold text-green-500">71.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Backtests</span>
                  <span className="font-bold">156</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackForge;
