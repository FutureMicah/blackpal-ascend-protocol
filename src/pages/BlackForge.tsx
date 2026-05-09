import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hammer, Zap, TrendingUp, Target, Shield, Sparkles, Play, Save, Loader2, Trash2 } from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Strategy {
  id: string;
  name: string;
  asset: string;
  timeframe: string;
  stop_loss: string | null;
  take_profit: string | null;
  is_deployed: boolean;
  created_at: string;
}

const BlackForge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [strategyName, setStrategyName] = useState("");
  const [assetClass, setAssetClass] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [stopLoss, setStopLoss] = useState("2");
  const [takeProfit, setTakeProfit] = useState("6");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }
      setUserId(user.id);
      await loadStrategies(user.id);
    };
    init();
  }, [navigate]);

  const loadStrategies = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_strategies")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setStrategies((data || []) as Strategy[]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to load", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveStrategy = async () => {
    if (!userId || !strategyName || !assetClass || !timeframe) {
      toast({ variant: "destructive", title: "Missing fields" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("user_strategies")
        .insert({
          user_id: userId,
          name: strategyName,
          asset: assetClass,
          timeframe,
          stop_loss: stopLoss,
          take_profit: takeProfit,
        })
        .select()
        .single();
      if (error) throw error;
      setStrategies((prev) => [data as Strategy, ...prev]);
      toast({ title: "Strategy saved", description: "Stored to your account." });
      setStrategyName(""); setAssetClass(""); setTimeframe(""); setStopLoss("2"); setTakeProfit("6");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      const { error } = await supabase.from("user_strategies").delete().eq("id", id);
      if (error) throw error;
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Strategy deleted" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const deployStrategy = async (strategy: Strategy) => {
    try {
      const { error } = await supabase
        .from("user_strategies")
        .update({ is_deployed: !strategy.is_deployed })
        .eq("id", strategy.id);
      if (error) throw error;
      setStrategies((prev) =>
        prev.map((s) => (s.id === strategy.id ? { ...s, is_deployed: !s.is_deployed } : s))
      );
      toast({
        title: strategy.is_deployed ? "Strategy paused" : "Strategy deployed",
        description: strategy.name,
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Hammer className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold">BlackForge</h1>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Craft, test, and deploy strategies</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <Card className="p-3 sm:p-4">
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3 h-8">
                  <TabsTrigger value="builder" className="text-xs">Builder</TabsTrigger>
                  <TabsTrigger value="saved" className="text-xs">Saved ({strategies.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="builder" className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Strategy Name *</Label>
                    <Input placeholder="My Strategy" value={strategyName} onChange={e => setStrategyName(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Asset *</Label>
                      <Select value={assetClass} onValueChange={setAssetClass}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="forex">Forex</SelectItem>
                          <SelectItem value="crypto">Crypto</SelectItem>
                          <SelectItem value="stocks">Stocks</SelectItem>
                          <SelectItem value="indices">Indices</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px]">Timeframe *</Label>
                      <Select value={timeframe} onValueChange={setTimeframe}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1m">1 Min</SelectItem>
                          <SelectItem value="5m">5 Min</SelectItem>
                          <SelectItem value="15m">15 Min</SelectItem>
                          <SelectItem value="1h">1 Hour</SelectItem>
                          <SelectItem value="4h">4 Hours</SelectItem>
                          <SelectItem value="1d">Daily</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Card className="p-2.5 bg-muted/20">
                    <h3 className="text-[10px] font-semibold mb-2 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-primary" /> Risk Management
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-[9px]">Stop Loss (%)</Label><Input placeholder="2%" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className="h-7 text-xs" /></div>
                      <div className="space-y-1"><Label className="text-[9px]">Take Profit (%)</Label><Input placeholder="6%" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className="h-7 text-xs" /></div>
                    </div>
                  </Card>
                  <Button className="w-full h-8 text-xs" onClick={saveStrategy} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Save Strategy
                  </Button>
                </TabsContent>
                <TabsContent value="saved">
                  {strategies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Hammer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold">No strategies yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {strategies.map(s => (
                        <Card key={s.id} className="p-2.5 bg-muted/20">
                          <div className="flex items-start justify-between mb-1 gap-2">
                            <div className="min-w-0">
                              <h3 className="text-xs font-semibold truncate">{s.name}</h3>
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                <Badge variant="outline" className="text-[8px] px-1 py-0">{s.asset}</Badge>
                                <Badge variant="outline" className="text-[8px] px-1 py-0">{s.timeframe}</Badge>
                                {s.is_deployed && (
                                  <Badge className="text-[8px] px-1 py-0 bg-primary text-primary-foreground">Live</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" className="h-6 text-[9px] px-2" onClick={() => deployStrategy(s)}>
                                <Play className="w-2.5 h-2.5 mr-0.5" /> {s.is_deployed ? "Pause" : "Deploy"}
                              </Button>
                              <Button size="sm" variant="destructive" className="h-6 px-1.5" onClick={() => deleteStrategy(s.id)}>
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-3 text-[9px] text-muted-foreground">
                            <span>SL: {s.stop_loss ?? "-"}%</span><span>TP: {s.take_profit ?? "-"}%</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-3">
            <Card className="p-3">
              <h2 className="text-xs font-bold mb-3">Templates</h2>
              <div className="space-y-2">
                {[
                  { name: "Scalping Master", winRate: "76%", icon: Zap },
                  { name: "Swing Trader Pro", winRate: "68%", icon: TrendingUp },
                  { name: "Breakout Hunter", winRate: "72%", icon: Target },
                ].map((t, i) => (
                  <Card key={i} className="p-2.5 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/20">
                        <t.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-semibold truncate">{t.name}</h3>
                        <span className="text-[8px] text-muted-foreground">Win: {t.winRate}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full mt-1.5 h-6 text-[9px] text-primary" onClick={() => { setStrategyName(t.name); toast({ title: "Template loaded" }); }}>
                      Use Template
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>
            <Card className="p-3">
              <h3 className="text-xs font-bold mb-2">Quick Stats</h3>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-bold">{strategies.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Deployed</span><span className="font-bold text-primary">{strategies.filter(s => s.is_deployed).length}</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackForge;
