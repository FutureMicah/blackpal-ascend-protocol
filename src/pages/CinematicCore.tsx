import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLivePrices, getSymbolList } from "@/hooks/use-live-prices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Activity, Target,
  Shield, Zap, Clock, DollarSign, AlertTriangle, ChevronDown, ChevronUp,
  Maximize2, Minimize2, X, Loader2
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";

interface PropAccount {
  id: string;
  tier_id: string;
  account_balance: number;
  starting_balance: number;
  current_equity: number;
  highest_balance: number;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  trading_days: number;
  status: string;
  phase: string;
  access_code: string;
  created_at: string;
}

interface PropTier {
  id: string;
  tier_name: string;
  tier_level: number;
  account_size: number;
  max_daily_loss_percent: number;
  max_total_drawdown_percent: number;
  profit_target_percent: number;
  profit_split_percent: number;
  min_trading_days: number;
  max_trading_days: number;
  badge_icon: string;
}

interface OpenTrade {
  id: string;
  symbol: string;
  trade_type: string;
  lot_size: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  profit_loss: number;
  opened_at: string;
}

const CHART_COLORS = {
  up: "hsl(142, 76%, 46%)",
  down: "hsl(0, 85%, 60%)",
  grid: "hsl(220, 15%, 20%)",
  text: "hsl(220, 10%, 60%)",
};

export default function CinematicCore() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [propAccount, setPropAccount] = useState<PropAccount | null>(null);
  const [tier, setTier] = useState<PropTier | null>(null);
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("EUR/USD");
  const [lotSize, setLotSize] = useState("0.01");
  const [slPips, setSlPips] = useState("50");
  const [tpPips, setTpPips] = useState("100");
  const [chartData, setChartData] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [showTradePanel, setShowTradePanel] = useState(true);
  const [dailyPnl, setDailyPnl] = useState(0);
  const chartRef = useRef<any[]>([]);

  const symbols = getSymbolList();
  const prices = useLivePrices(symbols, 500);
  const currentPrice = prices[selectedSymbol];

  // Build chart data from price ticks
  useEffect(() => {
    if (!currentPrice) return;
    const now = new Date();
    const point = {
      time: now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      price: currentPrice.bid,
      high: currentPrice.ask,
      low: currentPrice.bid,
    };
    chartRef.current = [...chartRef.current.slice(-120), point];
    setChartData([...chartRef.current]);
  }, [currentPrice]);

  // Load prop account
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/cinematic-access"); return; }
      setUserId(user.id);

      const { data: accounts } = await supabase
        .from("user_prop_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!accounts || accounts.length === 0) {
        navigate("/cinematic-access");
        return;
      }

      const account = accounts[0];
      setPropAccount(account as any);

      const { data: tierData } = await supabase
        .from("prop_tiers")
        .select("*")
        .eq("id", account.tier_id)
        .single();

      if (tierData) setTier(tierData as any);

      // Load open trades
      const { data: trades } = await supabase
        .from("prop_trades")
        .select("*")
        .eq("prop_account_id", account.id)
        .eq("status", "open");

      if (trades) setOpenTrades(trades as any);
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Calculate floating PnL for open trades
  const getFloatingPnl = useCallback((trade: OpenTrade) => {
    const price = prices[trade.symbol];
    if (!price) return 0;
    const exitPrice = trade.trade_type === "buy" ? price.bid : price.ask;
    const direction = trade.trade_type === "buy" ? 1 : -1;
    const pipValue = trade.symbol.includes("JPY") ? 0.01 : 0.0001;
    const pips = ((exitPrice - trade.entry_price) / pipValue) * direction;
    return pips * trade.lot_size * (trade.symbol.includes("JPY") ? 100 : 10);
  }, [prices]);

  const totalFloatingPnl = openTrades.reduce((sum, t) => sum + getFloatingPnl(t), 0);
  const equity = (propAccount?.account_balance || 0) + totalFloatingPnl;

  // Check risk limits
  const checkRiskLimits = useCallback(() => {
    if (!propAccount || !tier) return { dailyOk: true, drawdownOk: true };
    const dailyLossLimit = propAccount.starting_balance * (tier.max_daily_loss_percent / 100);
    const drawdownLimit = propAccount.starting_balance * (tier.max_total_drawdown_percent / 100);
    const totalDrawdown = propAccount.starting_balance - equity;
    return {
      dailyOk: Math.abs(dailyPnl) < dailyLossLimit,
      drawdownOk: totalDrawdown < drawdownLimit,
      dailyUsed: (Math.abs(dailyPnl) / dailyLossLimit) * 100,
      drawdownUsed: (Math.max(0, totalDrawdown) / drawdownLimit) * 100,
      profitProgress: ((equity - propAccount.starting_balance) / (propAccount.starting_balance * (tier.profit_target_percent / 100))) * 100,
    };
  }, [propAccount, tier, equity, dailyPnl]);

  const risk = checkRiskLimits();

  // Execute trade
  const executeTrade = async (type: "buy" | "sell") => {
    if (!propAccount || !currentPrice || !userId) return;
    const entryPrice = type === "buy" ? currentPrice.ask : currentPrice.bid;
    const pipSize = selectedSymbol.includes("JPY") ? 0.01 : 0.0001;
    const sl = slPips ? (type === "buy" ? entryPrice - Number(slPips) * pipSize : entryPrice + Number(slPips) * pipSize) : null;
    const tp = tpPips ? (type === "buy" ? entryPrice + Number(tpPips) * pipSize : entryPrice - Number(tpPips) * pipSize) : null;

    const { data, error } = await supabase.from("prop_trades").insert({
      prop_account_id: propAccount.id,
      user_id: userId,
      symbol: selectedSymbol,
      trade_type: type,
      lot_size: Number(lotSize),
      entry_price: entryPrice,
      stop_loss: sl,
      take_profit: tp,
      status: "open",
    }).select().single();

    if (error) { toast.error("Trade failed"); return; }
    setOpenTrades(prev => [...prev, data as any]);
    toast.success(`${type.toUpperCase()} ${selectedSymbol} @ ${entryPrice}`);

    // Update trade count
    await supabase.from("user_prop_accounts").update({
      total_trades: (propAccount.total_trades || 0) + 1,
    }).eq("id", propAccount.id);
  };

  // Close trade
  const closeTrade = async (trade: OpenTrade) => {
    if (!propAccount || !userId) return;
    const price = prices[trade.symbol];
    if (!price) return;
    const exitPrice = trade.trade_type === "buy" ? price.bid : price.ask;
    const pnl = getFloatingPnl(trade);

    await supabase.from("prop_trades").update({
      exit_price: exitPrice,
      profit_loss: pnl,
      status: "closed",
      closed_at: new Date().toISOString(),
    }).eq("id", trade.id);

    const newBalance = propAccount.account_balance + pnl;
    const isWin = pnl > 0;
    await supabase.from("user_prop_accounts").update({
      account_balance: newBalance,
      current_equity: newBalance,
      highest_balance: Math.max(propAccount.highest_balance, newBalance),
      total_pnl: propAccount.total_pnl + pnl,
      winning_trades: propAccount.winning_trades + (isWin ? 1 : 0),
      losing_trades: propAccount.losing_trades + (isWin ? 0 : 1),
    }).eq("id", propAccount.id);

    setPropAccount(prev => prev ? {
      ...prev,
      account_balance: newBalance,
      current_equity: newBalance,
      total_pnl: prev.total_pnl + pnl,
      winning_trades: prev.winning_trades + (isWin ? 1 : 0),
      losing_trades: prev.losing_trades + (isWin ? 0 : 1),
    } : null);

    setOpenTrades(prev => prev.filter(t => t.id !== trade.id));
    setDailyPnl(prev => prev + pnl);
    toast.success(`Closed ${trade.symbol} ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
  };

  // Auto SL/TP check
  useEffect(() => {
    openTrades.forEach(trade => {
      const price = prices[trade.symbol];
      if (!price) return;
      const current = trade.trade_type === "buy" ? price.bid : price.ask;
      if (trade.stop_loss && ((trade.trade_type === "buy" && current <= trade.stop_loss) || (trade.trade_type === "sell" && current >= trade.stop_loss))) {
        closeTrade(trade);
      }
      if (trade.take_profit && ((trade.trade_type === "buy" && current >= trade.take_profit) || (trade.trade_type === "sell" && current <= trade.take_profit))) {
        closeTrade(trade);
      }
    });
  }, [prices]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const winRate = propAccount && propAccount.total_trades > 0
    ? ((propAccount.winning_trades / propAccount.total_trades) * 100).toFixed(1)
    : "0.0";

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col ${expanded ? "fixed inset-0 z-50" : ""}`}>
      {/* Top Bar - Trading Terminal Header */}
      <header className="h-10 border-b border-border bg-card/90 backdrop-blur-xl flex items-center px-3 gap-4 shrink-0">
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => navigate("/prop-dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">{tier?.badge_icon}</span>
          <span className="text-xs font-semibold">{tier?.tier_name} Account</span>
          <Badge variant="outline" className="text-[10px] h-5">{propAccount?.phase}</Badge>
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground">Balance:</span>
          <span className="font-mono font-bold">${propAccount?.account_balance.toFixed(2)}</span>
          <span className="text-muted-foreground">Equity:</span>
          <span className={`font-mono font-bold ${equity >= (propAccount?.account_balance || 0) ? "text-green-500" : "text-destructive"}`}>
            ${equity.toFixed(2)}
          </span>
          <span className="text-muted-foreground">P&L:</span>
          <span className={`font-mono font-bold ${totalFloatingPnl >= 0 ? "text-green-500" : "text-destructive"}`}>
            {totalFloatingPnl >= 0 ? "+" : ""}${totalFloatingPnl.toFixed(2)}
          </span>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Watchlist */}
        <aside className="w-48 border-r border-border bg-card/50 overflow-y-auto shrink-0 hidden md:block">
          <div className="p-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Market Watch</p>
            {symbols.map(sym => {
              const p = prices[sym];
              if (!p) return null;
              const isUp = p.change >= 0;
              return (
                <button
                  key={sym}
                  onClick={() => { setSelectedSymbol(sym); chartRef.current = []; }}
                  className={`w-full flex items-center justify-between p-1.5 rounded-md text-[11px] transition-colors ${
                    selectedSymbol === sym ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30"
                  }`}
                >
                  <span className="font-medium">{sym}</span>
                  <div className="text-right">
                    <span className={`font-mono ${isUp ? "text-green-500" : "text-destructive"}`}>
                      {p.bid.toFixed(sym.includes("JPY") || ["BTC/USD","ETH/USD","XAU/USD","US30","NAS100"].includes(sym) ? 2 : 5)}
                    </span>
                    <div className={`text-[9px] ${isUp ? "text-green-500" : "text-destructive"}`}>
                      {isUp ? "+" : ""}{p.changePercent}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center: Chart */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Symbol selector for mobile */}
          <div className="md:hidden flex items-center gap-2 p-2 border-b border-border overflow-x-auto">
            {symbols.slice(0, 8).map(sym => (
              <button
                key={sym}
                onClick={() => { setSelectedSymbol(sym); chartRef.current = []; }}
                className={`px-2 py-1 rounded text-[10px] whitespace-nowrap shrink-0 ${
                  selectedSymbol === sym ? "bg-primary/20 text-primary" : "text-muted-foreground"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Chart header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/30">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">{selectedSymbol}</span>
              {currentPrice && (
                <>
                  <span className={`text-lg font-mono font-bold ${currentPrice.change >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {currentPrice.bid.toFixed(selectedSymbol.includes("JPY") || ["BTC/USD","ETH/USD","XAU/USD","US30","NAS100"].includes(selectedSymbol) ? 2 : 5)}
                  </span>
                  <span className={`text-xs ${currentPrice.change >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {currentPrice.change >= 0 ? "+" : ""}{currentPrice.changePercent}%
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] h-5">LIVE</Badge>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>

          {/* Chart area */}
          <div className="flex-1 min-h-0 p-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: CHART_COLORS.text }} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => v.toFixed(selectedSymbol.includes("JPY") || ["BTC/USD","ETH/USD","XAU/USD","US30","NAS100"].includes(selectedSymbol) ? 2 : 4)} />
                <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} isAnimationActive={false} />
                {openTrades.filter(t => t.symbol === selectedSymbol).map(trade => (
                  <ReferenceLine key={trade.id} y={trade.entry_price} stroke={trade.trade_type === "buy" ? CHART_COLORS.up : CHART_COLORS.down} strokeDasharray="3 3" label={{ value: `${trade.trade_type.toUpperCase()} @ ${trade.entry_price}`, fontSize: 9, fill: trade.trade_type === "buy" ? CHART_COLORS.up : CHART_COLORS.down }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Open positions */}
          {openTrades.length > 0 && (
            <div className="border-t border-border max-h-32 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left p-1 px-2">Symbol</th>
                    <th className="text-left p-1">Type</th>
                    <th className="text-right p-1">Lots</th>
                    <th className="text-right p-1">Entry</th>
                    <th className="text-right p-1">SL</th>
                    <th className="text-right p-1">TP</th>
                    <th className="text-right p-1">P&L</th>
                    <th className="text-right p-1 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map(trade => {
                    const pnl = getFloatingPnl(trade);
                    return (
                      <tr key={trade.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-1 px-2 font-medium">{trade.symbol}</td>
                        <td className={`p-1 font-semibold ${trade.trade_type === "buy" ? "text-green-500" : "text-destructive"}`}>
                          {trade.trade_type.toUpperCase()}
                        </td>
                        <td className="p-1 text-right font-mono">{trade.lot_size}</td>
                        <td className="p-1 text-right font-mono">{trade.entry_price}</td>
                        <td className="p-1 text-right font-mono text-destructive">{trade.stop_loss?.toFixed(5) || "—"}</td>
                        <td className="p-1 text-right font-mono text-green-500">{trade.take_profit?.toFixed(5) || "—"}</td>
                        <td className={`p-1 text-right font-mono font-bold ${pnl >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                        </td>
                        <td className="p-1 px-2 text-right">
                          <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => closeTrade(trade)}>
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Right: Trade Panel + Risk */}
        <aside className={`border-l border-border bg-card/50 shrink-0 overflow-y-auto ${showTradePanel ? "w-60" : "w-0"} transition-all hidden lg:block`}>
          <div className="p-3 space-y-3">
            {/* Quick trade */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">New Order</p>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground">Lot Size</label>
                  <Input value={lotSize} onChange={e => setLotSize(e.target.value)} className="h-7 text-xs font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-[10px] text-muted-foreground">SL (pips)</label>
                    <Input value={slPips} onChange={e => setSlPips(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">TP (pips)</label>
                    <Input value={tpPips} onChange={e => setTpPips(e.target.value)} className="h-7 text-xs font-mono" />
                  </div>
                </div>
              </div>
              {currentPrice && (
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-center p-1 rounded bg-muted/30">
                    <p className="text-[9px] text-muted-foreground">BID</p>
                    <p className="text-xs font-mono font-bold text-destructive">{currentPrice.bid}</p>
                  </div>
                  <div className="text-center p-1 rounded bg-muted/30">
                    <p className="text-[9px] text-muted-foreground">ASK</p>
                    <p className="text-xs font-mono font-bold text-green-500">{currentPrice.ask}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1">
                <Button onClick={() => executeTrade("sell")} className="h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold">
                  <TrendingDown className="w-3 h-3 mr-1" />SELL
                </Button>
                <Button onClick={() => executeTrade("buy")} className="h-9 bg-green-600 hover:bg-green-700 text-white text-xs font-bold">
                  <TrendingUp className="w-3 h-3 mr-1" />BUY
                </Button>
              </div>
            </div>

            {/* Risk Monitor */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" /> Risk Monitor
              </p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Daily Loss</span>
                    <span className={risk.dailyOk ? "text-green-500" : "text-destructive"}>
                      {(risk as any).dailyUsed?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <Progress value={Math.min((risk as any).dailyUsed || 0, 100)} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className={risk.drawdownOk ? "text-green-500" : "text-destructive"}>
                      {(risk as any).drawdownUsed?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <Progress value={Math.min((risk as any).drawdownUsed || 0, 100)} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-muted-foreground">Profit Target</span>
                    <span className="text-primary">{Math.max(0, (risk as any).profitProgress || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(Math.max(0, (risk as any).profitProgress || 0), 100)} className="h-1.5" />
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3" /> Stats
              </p>
              {[
                { label: "Win Rate", value: `${winRate}%` },
                { label: "Total Trades", value: propAccount?.total_trades || 0 },
                { label: "Wins / Losses", value: `${propAccount?.winning_trades || 0} / ${propAccount?.losing_trades || 0}` },
                { label: "Trading Days", value: propAccount?.trading_days || 0 },
                { label: "Realized P&L", value: `$${propAccount?.total_pnl.toFixed(2) || "0.00"}` },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono font-medium">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Rules */}
            {tier && (
              <div className="space-y-1 pt-2 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3" /> Rules
                </p>
                {[
                  { label: "Daily Loss Limit", value: `${tier.max_daily_loss_percent}%` },
                  { label: "Max Drawdown", value: `${tier.max_total_drawdown_percent}%` },
                  { label: "Profit Target", value: `${tier.profit_target_percent}%` },
                  { label: "Min Trading Days", value: tier.min_trading_days },
                  { label: "Max Trading Days", value: tier.max_trading_days },
                  { label: "Profit Split", value: `${tier.profit_split_percent}%` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-mono">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
