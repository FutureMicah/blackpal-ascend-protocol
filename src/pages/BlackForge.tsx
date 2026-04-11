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
  id: string; name: string; asset: string; timeframe: string; stopLoss: string; takeProfit: string; createdAt: string;
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
    try { const saved = localStorage.getItem(`strategies_${uid}`); if (saved) setStrategies(JSON.parse(saved)); } catch {} finally { setLoading(false); }
  };

  const saveStrategy = async () => {
    if (!userId || !strategyName || !assetClass || !timeframe) { toast({ variant: "destructive", title: "Missing fields" }); return; }
    setSaving(true);
    try {
      const newStrategy: Strategy = { id: Date.now().toString(), name: strategyName, asset: assetClass, timeframe, stopLoss, takeProfit, createdAt: new Date().toISOString() };
      const updated = [...strategies, newStrategy];
      setStrategies(updated);
      localStorage.setItem(`strategies_${userId}`, JSON.stringify(updated));
      const { data: profile } = await supabase.from("profiles").select("xp_points").eq("id", userId).single();
      await supabase.from("profiles").update({ xp_points: (profile?.xp_points || 0) + 50 }).eq("id", userId);
      toast({ title: "Strategy saved!", description: "+50 XP earned" });
      setStrategyName(""); setAssetClass(""); setTimeframe(""); setStopLoss("2"); setTakeProfit("6");
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); } finally { setSaving(false); }
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
      const { data: profile } = await supabase.from("profiles").select("xp_points").eq("id", userId).single();
      await supabase.from("profiles").update({ xp_points: (profile?.xp_points || 0) + 100 }).eq("id", userId);
      toast({ title: "Strategy deployed!", description: `${strategy.name} is active. +100 XP!` });
    } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-16 pb-8">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Hammer className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-2xl font-bold">BlackForge</h1>
            <Sparkles className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground">Craft, test, and deploy strategies</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Builder */}
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
                              <div className="flex gap-1 mt-0.5">
                                <Badge variant="outline" className="text-[8px] px-1 py-0">{s.asset}</Badge>
                                <Badge variant="outline" className="text-[8px] px-1 py-0">{s.timeframe}</Badge>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" className="h-6 text-[9px] px-2" onClick={() => deployStrategy(s)}>
                                <Play className="w-2.5 h-2.5 mr-0.5" /> Deploy
                              </Button>
                              <Button size="sm" variant="destructive" className="h-6 px-1.5" onClick={() => deleteStrategy(s.id)}>
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-3 text-[9px] text-muted-foreground">
                            <span>SL: {s.stopLoss}%</span><span>TP: {s.takeProfit}%</span>
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
          <div className="space-y-3">
            <Card className="p-3">
              <h2 className="text-xs font-bold mb-3">Templates</h2>
              <div className="space-y-2">
                {[
                  { name: "Scalping Master", winRate: "76%", icon: Zap, color: "from-yellow-400 to-orange-600" },
                  { name: "Swing Trader Pro", winRate: "68%", icon: TrendingUp, color: "from-blue-400 to-purple-600" },
                  { name: "Breakout Hunter", winRate: "72%", icon: Target, color: "from-green-400 to-emerald-600" },
                ].map((t, i) => (
                  <Card key={i} className="p-2.5 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-gradient-to-br ${t.color}`}>
                        <t.icon className="w-3.5 h-3.5 text-white" />
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
                <div className="flex justify-between"><span className="text-muted-foreground">XP/Strategy</span><span className="font-bold text-primary">+50</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">XP/Deploy</span><span className="font-bold text-green-500">+100</span></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackForge;
