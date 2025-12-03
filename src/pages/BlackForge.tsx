import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hammer, Zap, TrendingUp, Target, Shield, Sparkles, Play, Save, Share2, Loader2, Trash2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Strategy {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  stopLoss: string;
  takeProfit: string;
  createdAt: string;
}

const BlackForge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  
  // Form state
  const [strategyName, setStrategyName] = useState("");
  const [assetClass, setAssetClass] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [stopLoss, setStopLoss] = useState("2");
  const [takeProfit, setTakeProfit] = useState("6");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);
      await loadStrategies(user.id);
    };
    init();
  }, [navigate]);

  const loadStrategies = async (uid: string) => {
    setLoading(true);
    try {
      // Load strategies from localStorage (in real app, would be from database)
      const saved = localStorage.getItem(`strategies_${uid}`);
      if (saved) {
        setStrategies(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading strategies:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveStrategy = async () => {
    if (!userId || !strategyName || !assetClass || !timeframe) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields",
      });
      return;
    }

    setSaving(true);
    try {
      const newStrategy: Strategy = {
        id: Date.now().toString(),
        name: strategyName,
        asset: assetClass,
        timeframe,
        stopLoss,
        takeProfit,
        createdAt: new Date().toISOString(),
      };

      const updated = [...strategies, newStrategy];
      setStrategies(updated);
      localStorage.setItem(`strategies_${userId}`, JSON.stringify(updated));

      // Award XP for creating strategy
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .single();

      await supabase
        .from("profiles")
        .update({ xp_points: (profile?.xp_points || 0) + 50 })
        .eq("id", userId);

      // Post activity
      await supabase.from("friend_activities").insert({
        user_id: userId,
        activity_type: "strategy_created",
        activity_data: { strategyName }
      });

      toast({
        title: "Strategy saved!",
        description: "+50 XP earned for creating a strategy",
      });

      // Reset form
      setStrategyName("");
      setAssetClass("");
      setTimeframe("");
      setStopLoss("2");
      setTakeProfit("6");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteStrategy = (id: string) => {
    if (!userId) return;
    const updated = strategies.filter(s => s.id !== id);
    setStrategies(updated);
    localStorage.setItem(`strategies_${userId}`, JSON.stringify(updated));
    toast({ title: "Strategy deleted" });
  };

  const deployStrategy = async (strategy: Strategy) => {
    if (!userId) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", userId)
        .single();

      await supabase
        .from("profiles")
        .update({ xp_points: (profile?.xp_points || 0) + 100 })
        .eq("id", userId);

      await supabase.from("friend_activities").insert({
        user_id: userId,
        activity_type: "strategy_deployed",
        activity_data: { strategyName: strategy.name }
      });

      toast({
        title: "Strategy deployed!",
        description: `${strategy.name} is now active. +100 XP earned!`,
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Hammer className="w-10 h-10 text-primary" />
            <h1 className="text-5xl font-bold gradient-text-cyber">BlackForge</h1>
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Craft, test, and deploy your trading strategies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy Builder */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card p-6">
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="builder">Builder</TabsTrigger>
                  <TabsTrigger value="saved">Saved ({strategies.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Strategy Name *</Label>
                      <Input
                        placeholder="My Advanced Strategy"
                        value={strategyName}
                        onChange={(e) => setStrategyName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Asset Class *</Label>
                        <Select value={assetClass} onValueChange={setAssetClass}>
                          <SelectTrigger>
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
                        <Label>Timeframe *</Label>
                        <Select value={timeframe} onValueChange={setTimeframe}>
                          <SelectTrigger>
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

                    <Card className="p-4 bg-background/30">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Risk Management
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Stop Loss (%)</Label>
                          <Input 
                            placeholder="2%" 
                            value={stopLoss}
                            onChange={(e) => setStopLoss(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Take Profit (%)</Label>
                          <Input 
                            placeholder="6%" 
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>

                    <Button 
                      className="w-full"
                      onClick={saveStrategy}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Strategy
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="saved">
                  {strategies.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Hammer className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">No strategies yet</h3>
                      <p>Create your first strategy in the Builder tab</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {strategies.map((strategy) => (
                        <Card key={strategy.id} className="p-4 bg-background/30">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{strategy.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{strategy.asset}</Badge>
                                <Badge variant="outline">{strategy.timeframe}</Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => deployStrategy(strategy)}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Deploy
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteStrategy(strategy.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>SL: {strategy.stopLoss}%</span>
                            <span>TP: {strategy.takeProfit}%</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h2 className="text-xl font-bold gradient-text-cyber mb-6">Strategy Templates</h2>
              <div className="space-y-4">
                {[
                  { name: "Scalping Master", winRate: "76%", icon: Zap, color: "from-yellow-400 to-orange-600" },
                  { name: "Swing Trader Pro", winRate: "68%", icon: TrendingUp, color: "from-blue-400 to-purple-600" },
                  { name: "Breakout Hunter", winRate: "72%", icon: Target, color: "from-green-400 to-emerald-600" },
                ].map((template, idx) => {
                  const IconComponent = template.icon;
                  return (
                    <Card key={idx} className="p-4 bg-background/30 hover:bg-background/50 transition-all cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${template.color}`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{template.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Target className="w-3 h-3" />
                            Win Rate: {template.winRate}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-3 text-primary"
                        onClick={() => {
                          setStrategyName(template.name);
                          toast({ title: "Template loaded", description: "Customize and save your strategy" });
                        }}
                      >
                        Use Template
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="font-bold mb-4">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strategies Created</span>
                  <span className="font-bold">{strategies.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">XP per Strategy</span>
                  <span className="font-bold text-primary">+50 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">XP per Deploy</span>
                  <span className="font-bold text-green-500">+100 XP</span>
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