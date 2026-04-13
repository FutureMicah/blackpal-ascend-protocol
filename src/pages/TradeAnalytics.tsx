import { useEffect, useState } from "react";
import { FloatingNav } from "@/components/FloatingNav";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, TrendingDown, Target, Award, Activity, PieChart, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPie, Pie, Cell } from "recharts";

export default function TradeAnalytics() {
  const [user, setUser] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0, winRate: 0, avgRR: 0, totalPnl: 0,
    bestTrade: 0, worstTrade: 0, avgWin: 0, avgLoss: 0,
    profitFactor: 0, maxConsecWins: 0, maxConsecLosses: 0,
  });
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
  const [symbolBreakdown, setSymbolBreakdown] = useState<any[]>([]);
  const [dailyPnl, setDailyPnl] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: journalTrades } = await supabase
        .from("journal_trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!journalTrades || journalTrades.length === 0) return;
      setTrades(journalTrades);

      // Calculate stats
      const wins = journalTrades.filter((t: any) => (t.profit_loss || 0) > 0);
      const losses = journalTrades.filter((t: any) => (t.profit_loss || 0) < 0);
      const totalPnl = journalTrades.reduce((s: number, t: any) => s + (t.profit_loss || 0), 0);
      const avgWin = wins.length > 0 ? wins.reduce((s: number, t: any) => s + t.profit_loss, 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s: number, t: any) => s + t.profit_loss, 0) / losses.length) : 0;

      let maxConsecW = 0, maxConsecL = 0, curW = 0, curL = 0;
      journalTrades.forEach((t: any) => {
        if ((t.profit_loss || 0) > 0) { curW++; curL = 0; maxConsecW = Math.max(maxConsecW, curW); }
        else if ((t.profit_loss || 0) < 0) { curL++; curW = 0; maxConsecL = Math.max(maxConsecL, curL); }
      });

      setStats({
        totalTrades: journalTrades.length,
        winRate: journalTrades.length > 0 ? (wins.length / journalTrades.length) * 100 : 0,
        avgRR: avgLoss > 0 ? avgWin / avgLoss : 0,
        totalPnl,
        bestTrade: Math.max(...journalTrades.map((t: any) => t.profit_loss || 0)),
        worstTrade: Math.min(...journalTrades.map((t: any) => t.profit_loss || 0)),
        avgWin, avgLoss,
        profitFactor: avgLoss > 0 ? (wins.reduce((s: number, t: any) => s + t.profit_loss, 0)) / Math.abs(losses.reduce((s: number, t: any) => s + t.profit_loss, 0) || 1) : 0,
        maxConsecWins: maxConsecW,
        maxConsecLosses: maxConsecL,
      });

      // Equity curve
      let cumPnl = 0;
      setEquityCurve(journalTrades.map((t: any, i: number) => {
        cumPnl += (t.profit_loss || 0);
        return { trade: i + 1, equity: Number(cumPnl.toFixed(2)) };
      }));

      // Symbol breakdown
      const symMap: Record<string, { wins: number; losses: number; pnl: number }> = {};
      journalTrades.forEach((t: any) => {
        if (!symMap[t.symbol]) symMap[t.symbol] = { wins: 0, losses: 0, pnl: 0 };
        symMap[t.symbol].pnl += (t.profit_loss || 0);
        if ((t.profit_loss || 0) > 0) symMap[t.symbol].wins++;
        else symMap[t.symbol].losses++;
      });
      setSymbolBreakdown(Object.entries(symMap).map(([symbol, data]) => ({
        symbol, ...data, total: data.wins + data.losses,
      })).sort((a, b) => b.total - a.total));

      // Daily P&L
      const dayMap: Record<string, number> = {};
      journalTrades.forEach((t: any) => {
        const day = new Date(t.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
        dayMap[day] = (dayMap[day] || 0) + (t.profit_loss || 0);
      });
      setDailyPnl(Object.entries(dayMap).map(([date, pnl]) => ({ date, pnl: Number(pnl.toFixed(2)) })));
    };
    load();
  }, []);

  const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FloatingNav />
      <div className="pt-16 pb-20 px-3 max-w-5xl mx-auto space-y-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Trade Analytics
          </h1>
          <p className="text-[10px] text-muted-foreground">Deep performance insights from your trading journal</p>
        </motion.div>

        {trades.length === 0 ? (
          <Card className="p-8 text-center bg-card/50 border-border/30">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No trades recorded yet. Add trades to your journal to see analytics.</p>
          </Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "Total Trades", value: stats.totalTrades, icon: Activity },
                { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: stats.winRate >= 50 ? "text-green-400" : "text-red-400" },
                { label: "Profit Factor", value: stats.profitFactor.toFixed(2), icon: Award, color: stats.profitFactor >= 1 ? "text-green-400" : "text-red-400" },
                { label: "Total P&L", value: `$${stats.totalPnl.toFixed(0)}`, icon: stats.totalPnl >= 0 ? TrendingUp : TrendingDown, color: stats.totalPnl >= 0 ? "text-green-400" : "text-red-400" },
              ].map((m, i) => (
                <Card key={i} className="p-2 bg-card/50 border-border/30">
                  <m.icon className={`w-3 h-3 mb-0.5 ${m.color || "text-muted-foreground"}`} />
                  <p className={`text-sm font-bold ${m.color || ""}`}>{m.value}</p>
                  <p className="text-[8px] text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>

            {/* Extended Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
              {[
                { label: "Avg Win", value: `$${stats.avgWin.toFixed(0)}`, color: "text-green-400" },
                { label: "Avg Loss", value: `-$${stats.avgLoss.toFixed(0)}`, color: "text-red-400" },
                { label: "Avg R:R", value: stats.avgRR.toFixed(2) },
                { label: "Best Trade", value: `$${stats.bestTrade.toFixed(0)}`, color: "text-green-400" },
                { label: "Worst Trade", value: `$${stats.worstTrade.toFixed(0)}`, color: "text-red-400" },
                { label: "Win Streak", value: stats.maxConsecWins },
              ].map((m, i) => (
                <Card key={i} className="p-1.5 bg-card/50 border-border/30 text-center">
                  <p className={`text-[10px] font-bold ${m.color || ""}`}>{m.value}</p>
                  <p className="text-[7px] text-muted-foreground">{m.label}</p>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="equity" className="space-y-2">
              <TabsList className="h-7 bg-muted/30 w-full">
                <TabsTrigger value="equity" className="text-[9px] flex-1">Equity Curve</TabsTrigger>
                <TabsTrigger value="daily" className="text-[9px] flex-1">Daily P&L</TabsTrigger>
                <TabsTrigger value="symbols" className="text-[9px] flex-1">By Symbol</TabsTrigger>
              </TabsList>

              <TabsContent value="equity">
                <Card className="p-2.5 bg-card/50 border-border/30">
                  <p className="text-[10px] font-medium mb-2">Equity Curve</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={equityCurve}>
                      <defs>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="trade" tick={{ fontSize: 8 }} />
                      <YAxis tick={{ fontSize: 8 }} />
                      <Tooltip contentStyle={{ fontSize: 10, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="url(#eqGrad)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="daily">
                <Card className="p-2.5 bg-card/50 border-border/30">
                  <p className="text-[10px] font-medium mb-2">Daily P&L</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyPnl}>
                      <XAxis dataKey="date" tick={{ fontSize: 7 }} />
                      <YAxis tick={{ fontSize: 8 }} />
                      <Tooltip contentStyle={{ fontSize: 10, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                        {dailyPnl.map((entry, index) => (
                          <Cell key={index} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="symbols">
                <Card className="p-2.5 bg-card/50 border-border/30">
                  <p className="text-[10px] font-medium mb-2">Performance by Symbol</p>
                  <div className="space-y-1.5">
                    {symbolBreakdown.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/20">
                        <span className="text-[10px] font-bold w-16">{s.symbol}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <div className="flex-1 bg-muted/30 rounded-full h-1">
                              <div className="h-full rounded-full bg-green-500" style={{ width: `${(s.wins / s.total) * 100}%` }} />
                            </div>
                            <span className="text-[8px] text-muted-foreground">{((s.wins / s.total) * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-[8px] text-muted-foreground">{s.wins}W / {s.losses}L ({s.total} trades)</p>
                        </div>
                        <span className={`text-[10px] font-bold ${s.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          ${s.pnl.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
