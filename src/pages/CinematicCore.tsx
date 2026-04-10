import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLivePrices, getSymbolList } from "@/hooks/use-live-prices";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity, Target,
  Shield, Maximize2, Minimize2, X, Loader2, BarChart2,
  ListOrdered, ChevronUp, ChevronDown, Settings2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";

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

const TV_SYMBOL_MAP: Record<string, string> = {
  "EUR/USD": "FX:EURUSD", "GBP/USD": "FX:GBPUSD", "USD/JPY": "FX:USDJPY",
  "AUD/USD": "FX:AUDUSD", "USD/CAD": "FX:USDCAD", "NZD/USD": "FX:NZDUSD",
  "EUR/GBP": "FX:EURGBP", "XAU/USD": "TVC:GOLD", "BTC/USD": "BITSTAMP:BTCUSD",
  "ETH/USD": "BITSTAMP:ETHUSD", "US30": "FOREXCOM:DJI", "NAS100": "FOREXCOM:NSXUSD",
};

function getDecimals(sym: string) {
  if (sym.includes("JPY") || sym === "US30" || sym === "NAS100") return 2;
  if (["BTC/USD", "ETH/USD", "XAU/USD"].includes(sym)) return 2;
  return 5;
}

const TVChart = memo(({ symbol, height }: { symbol: string; height: number }) => (
  <TradingViewWidget widgetType="chart" symbol={symbol} height={height} theme="dark" />
));
TVChart.displayName = "TVChart";

export default function CinematicCore() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [propAccount, setPropAccount] = useState<PropAccount | null>(null);
  const [tier, setTier] = useState<PropTier | null>(null);
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("EUR/USD");
  const [lotSize, setLotSize] = useState("0.01");
  const [slPips, setSlPips] = useState("50");
  const [tpPips, setTpPips] = useState("100");
  const [expanded, setExpanded] = useState(false);
  const [dailyPnl, setDailyPnl] = useState(0);
  const [bottomTab, setBottomTab] = useState<"trades" | "history">("trades");
  const [chartMode, setChartMode] = useState<"tv" | "live">("tv");
  const [chartData, setChartData] = useState<any[]>([]);
  const [mobilePanel, setMobilePanel] = useState<"chart" | "order" | "trades">("chart");
  const [showMarketWatch, setShowMarketWatch] = useState(false);
  const chartRef = useRef<any[]>([]);

  const symbols = getSymbolList();
  const prices = useLivePrices(symbols, 800);
  const currentPrice = prices[selectedSymbol];
  const tvSymbol = TV_SYMBOL_MAP[selectedSymbol] || "FX:EURUSD";

  useEffect(() => {
    if (!currentPrice || chartMode !== "live") return;
    const now = new Date();
    const point = { time: now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }), price: currentPrice.bid };
    chartRef.current = [...chartRef.current.slice(-80), point];
    setChartData([...chartRef.current]);
  }, [currentPrice, chartMode]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/cinematic-access"); return; }
      setUserId(user.id);
      const { data: accounts } = await supabase.from("user_prop_accounts").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1);
      if (!accounts || accounts.length === 0) { navigate("/cinematic-access"); return; }
      const account = accounts[0];
      setPropAccount(account as any);
      const [tierRes, tradesRes, historyRes] = await Promise.all([
        supabase.from("prop_tiers").select("*").eq("id", account.tier_id).single(),
        supabase.from("prop_trades").select("*").eq("prop_account_id", account.id).eq("status", "open"),
        supabase.from("prop_trades").select("*").eq("prop_account_id", account.id).eq("status", "closed").order("closed_at", { ascending: false }).limit(20),
      ]);
      if (tierRes.data) setTier(tierRes.data as any);
      if (tradesRes.data) setOpenTrades(tradesRes.data as any);
      if (historyRes.data) setClosedTrades(historyRes.data as any);
      setLoading(false);
    };
    init();
  }, [navigate]);

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

  const checkRiskLimits = useCallback(() => {
    if (!propAccount || !tier) return { dailyOk: true, drawdownOk: true, dailyUsed: 0, drawdownUsed: 0, profitProgress: 0 };
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

  const executeTrade = async (type: "buy" | "sell") => {
    if (!propAccount || !currentPrice || !userId) return;
    const entryPrice = type === "buy" ? currentPrice.ask : currentPrice.bid;
    const pipSize = selectedSymbol.includes("JPY") ? 0.01 : 0.0001;
    const sl = slPips ? (type === "buy" ? entryPrice - Number(slPips) * pipSize : entryPrice + Number(slPips) * pipSize) : null;
    const tp = tpPips ? (type === "buy" ? entryPrice + Number(tpPips) * pipSize : entryPrice - Number(tpPips) * pipSize) : null;
    const { data, error } = await supabase.from("prop_trades").insert({
      prop_account_id: propAccount.id, user_id: userId, symbol: selectedSymbol,
      trade_type: type, lot_size: Number(lotSize), entry_price: entryPrice,
      stop_loss: sl, take_profit: tp, status: "open",
    }).select().single();
    if (error) { toast.error("Trade failed"); return; }
    setOpenTrades(prev => [...prev, data as any]);
    toast.success(`${type.toUpperCase()} ${selectedSymbol} @ ${entryPrice.toFixed(getDecimals(selectedSymbol))}`);
    await supabase.from("user_prop_accounts").update({ total_trades: (propAccount.total_trades || 0) + 1 }).eq("id", propAccount.id);
  };

  const closeTrade = async (trade: OpenTrade) => {
    if (!propAccount || !userId) return;
    const price = prices[trade.symbol];
    if (!price) return;
    const exitPrice = trade.trade_type === "buy" ? price.bid : price.ask;
    const pnl = getFloatingPnl(trade);
    await supabase.from("prop_trades").update({ exit_price: exitPrice, profit_loss: pnl, status: "closed", closed_at: new Date().toISOString() }).eq("id", trade.id);
    const newBalance = propAccount.account_balance + pnl;
    const isWin = pnl > 0;
    await supabase.from("user_prop_accounts").update({
      account_balance: newBalance, current_equity: newBalance,
      highest_balance: Math.max(propAccount.highest_balance, newBalance),
      total_pnl: propAccount.total_pnl + pnl,
      winning_trades: propAccount.winning_trades + (isWin ? 1 : 0),
      losing_trades: propAccount.losing_trades + (isWin ? 0 : 1),
    }).eq("id", propAccount.id);
    setPropAccount(prev => prev ? { ...prev, account_balance: newBalance, current_equity: newBalance, total_pnl: prev.total_pnl + pnl, winning_trades: prev.winning_trades + (isWin ? 1 : 0), losing_trades: prev.losing_trades + (isWin ? 0 : 1) } : null);
    setOpenTrades(prev => prev.filter(t => t.id !== trade.id));
    setClosedTrades(prev => [{ ...trade, exit_price: exitPrice, profit_loss: pnl, status: "closed", closed_at: new Date().toISOString() }, ...prev.slice(0, 19)]);
    setDailyPnl(prev => prev + pnl);
    toast.success(`Closed ${trade.symbol} ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`);
  };

  useEffect(() => {
    openTrades.forEach(trade => {
      const price = prices[trade.symbol];
      if (!price) return;
      const current = trade.trade_type === "buy" ? price.bid : price.ask;
      if (trade.stop_loss && ((trade.trade_type === "buy" && current <= trade.stop_loss) || (trade.trade_type === "sell" && current >= trade.stop_loss))) closeTrade(trade);
      if (trade.take_profit && ((trade.trade_type === "buy" && current >= trade.take_profit) || (trade.trade_type === "sell" && current <= trade.take_profit))) closeTrade(trade);
    });
  }, [prices]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const winRate = propAccount && propAccount.total_trades > 0 ? ((propAccount.winning_trades / propAccount.total_trades) * 100).toFixed(1) : "0.0";
  const spread = currentPrice ? (currentPrice.ask - currentPrice.bid) : 0;
  const dec = getDecimals(selectedSymbol);

  // ── ORDER PANEL (shared between mobile sheet & desktop sidebar) ──
  const OrderPanel = () => (
    <div className="space-y-3 p-3">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">New Order — {selectedSymbol}</p>
      <div>
        <label className="text-[10px] text-zinc-500">Volume (lots)</label>
        <Input value={lotSize} onChange={e => setLotSize(e.target.value)} className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-white" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-zinc-500">SL (pips)</label>
          <Input value={slPips} onChange={e => setSlPips(e.target.value)} className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-white" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500">TP (pips)</label>
          <Input value={tpPips} onChange={e => setTpPips(e.target.value)} className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 text-white" />
        </div>
      </div>
      {currentPrice && (
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center py-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <p className="text-[9px] text-zinc-600">BID</p>
            <p className="text-sm font-mono font-bold text-red-400">{currentPrice.bid.toFixed(dec)}</p>
          </div>
          <div className="text-center py-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
            <p className="text-[9px] text-zinc-600">ASK</p>
            <p className="text-sm font-mono font-bold text-emerald-400">{currentPrice.ask.toFixed(dec)}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => executeTrade("sell")}
          className="h-11 rounded-lg bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95">
          <TrendingDown className="w-4 h-4" />SELL
        </button>
        <button onClick={() => executeTrade("buy")}
          className="h-11 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95">
          <TrendingUp className="w-4 h-4" />BUY
        </button>
      </div>
      {/* Risk mini */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Shield className="w-3 h-3" />Risk</p>
        {[
          { label: "Daily Loss", value: risk.dailyUsed, ok: risk.dailyOk, color: "bg-red-500" },
          { label: "Max Drawdown", value: risk.drawdownUsed, ok: risk.drawdownOk, color: "bg-orange-500" },
          { label: "Profit Target", value: Math.max(0, risk.profitProgress), ok: true, color: "bg-emerald-500" },
        ].map(r => (
          <div key={r.label}>
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-zinc-500">{r.label}</span>
              <span className={r.ok ? "text-zinc-400" : "text-red-400"}>{r.value.toFixed(1)}%</span>
            </div>
            <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${r.color}`} style={{ width: `${Math.min(r.value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── TRADES TABLE ──
  const TradesTable = () => (
    <div className="overflow-x-auto">
      {openTrades.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-[11px] text-zinc-600">No open positions</div>
      ) : (
        <table className="w-full text-[10px]">
          <thead><tr className="text-zinc-600 border-b border-zinc-800/30">
            <th className="text-left p-1.5 pl-2">Sym</th><th className="text-left p-1.5">Type</th>
            <th className="text-right p-1.5">Lots</th><th className="text-right p-1.5">Entry</th>
            <th className="text-right p-1.5">P&L</th><th className="p-1.5"></th>
          </tr></thead>
          <tbody>{openTrades.map(trade => {
            const pnl = getFloatingPnl(trade);
            return (
              <tr key={trade.id} className="border-t border-zinc-800/20 hover:bg-zinc-800/20">
                <td className="p-1.5 pl-2 text-white font-medium">{trade.symbol}</td>
                <td className={`p-1.5 font-bold ${trade.trade_type === "buy" ? "text-emerald-400" : "text-red-400"}`}>{trade.trade_type.toUpperCase()}</td>
                <td className="p-1.5 text-right font-mono text-zinc-400">{trade.lot_size}</td>
                <td className="p-1.5 text-right font-mono text-zinc-300">{trade.entry_price.toFixed(getDecimals(trade.symbol))}</td>
                <td className={`p-1.5 text-right font-mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                </td>
                <td className="p-1.5 text-right">
                  <button onClick={() => closeTrade(trade)} className="text-red-500 hover:text-red-400 active:scale-90 transition-transform"><X className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
    </div>
  );

  // ═══ MOBILE LAYOUT ═══
  if (isMobile) {
    return (
      <div className="h-[100dvh] bg-[#0d0d12] text-zinc-200 flex flex-col overflow-hidden select-none">
        {/* Top bar */}
        <header className="h-10 bg-[#111118] border-b border-zinc-800/60 flex items-center px-2 gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-zinc-400" onClick={() => navigate("/my-accounts")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-bold text-emerald-400">{tier?.badge_icon}</span>
          <span className="text-[10px] font-semibold text-zinc-300 truncate">{tier?.tier_name}</span>
          <div className="flex-1" />
          <div className="text-right text-[9px] font-mono">
            <span className="text-zinc-500 mr-1">BAL</span>
            <span className="text-white font-bold">${propAccount?.account_balance.toFixed(0)}</span>
            <span className="text-zinc-500 ml-2 mr-1">P&L</span>
            <span className={totalFloatingPnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {totalFloatingPnl >= 0 ? "+" : ""}${totalFloatingPnl.toFixed(2)}
            </span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </header>

        {/* Symbol strip */}
        <div className="flex items-center gap-1 px-1.5 py-1 border-b border-zinc-800/50 overflow-x-auto bg-[#111118] shrink-0">
          {symbols.map(sym => {
            const p = prices[sym];
            return (
              <button key={sym} onClick={() => { setSelectedSymbol(sym); chartRef.current = []; }}
                className={`px-2 py-1 rounded-md text-[9px] whitespace-nowrap shrink-0 flex flex-col items-center min-w-[52px] ${
                  selectedSymbol === sym ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-500 border border-transparent"
                }`}>
                <span className="font-medium">{sym.replace("/", "")}</span>
                {p && <span className={`text-[8px] font-mono ${(p.change || 0) >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>{p.bid.toFixed(sym.includes("JPY") || sym === "US30" || sym === "NAS100" ? 1 : 4)}</span>}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 bg-[#0a0a0f] relative">
          {chartMode === "tv" ? (
            <TVChart symbol={tvSymbol} height={400} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="tickGradM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 8, fill: "#52525b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 8, fill: "#52525b" }} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => v.toFixed(dec > 3 ? 4 : 2)} />
                <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={1.5} fill="url(#tickGradM)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Chart mode toggle */}
          <div className="absolute top-1 right-1 flex gap-0.5">
            <button onClick={() => setChartMode("tv")} className={`px-2 py-0.5 rounded text-[8px] ${chartMode === "tv" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-900/80 text-zinc-500"}`}>TV</button>
            <button onClick={() => setChartMode("live")} className={`px-2 py-0.5 rounded text-[8px] ${chartMode === "live" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-900/80 text-zinc-500"}`}>Tick</button>
          </div>
        </div>

        {/* Open trades mini strip */}
        {openTrades.length > 0 && (
          <div className="border-t border-zinc-800/50 bg-[#0f0f16] max-h-20 overflow-y-auto shrink-0">
            {openTrades.map(trade => {
              const pnl = getFloatingPnl(trade);
              return (
                <div key={trade.id} className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/20 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${trade.trade_type === "buy" ? "text-emerald-400" : "text-red-400"}`}>{trade.trade_type === "buy" ? "▲" : "▼"}</span>
                    <span className="text-white font-medium">{trade.symbol}</span>
                    <span className="text-zinc-500 font-mono">{trade.lot_size}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</span>
                    <button onClick={() => closeTrade(trade)} className="text-red-500 active:scale-90"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom action bar */}
        <div className="bg-[#111118] border-t border-zinc-800/60 px-2 py-2 shrink-0 safe-area-pb">
          {currentPrice && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex-1 text-center py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <p className="text-[8px] text-zinc-600">BID</p>
                <p className="text-xs font-mono font-bold text-red-400">{currentPrice.bid.toFixed(dec)}</p>
              </div>
              <div className="flex-1">
                <Input value={lotSize} onChange={e => setLotSize(e.target.value)} className="h-8 text-[10px] font-mono bg-zinc-900 border-zinc-800 text-white text-center" placeholder="Lots" />
              </div>
              <div className="flex-1 text-center py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <p className="text-[8px] text-zinc-600">ASK</p>
                <p className="text-xs font-mono font-bold text-emerald-400">{currentPrice.ask.toFixed(dec)}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => executeTrade("sell")}
              className="h-10 rounded-lg bg-gradient-to-b from-red-600 to-red-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <TrendingDown className="w-4 h-4" />SELL
            </button>
            <button onClick={() => executeTrade("buy")}
              className="h-10 rounded-lg bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <TrendingUp className="w-4 h-4" />BUY
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[9px]">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">SL:</span>
              <Input value={slPips} onChange={e => setSlPips(e.target.value)} className="h-5 w-12 text-[9px] font-mono bg-zinc-900 border-zinc-800 text-white text-center px-1" />
              <span className="text-zinc-500">TP:</span>
              <Input value={tpPips} onChange={e => setTpPips(e.target.value)} className="h-5 w-12 text-[9px] font-mono bg-zinc-900 border-zinc-800 text-white text-center px-1" />
            </div>
            <span className="text-zinc-600">Spread: {(spread / (selectedSymbol.includes("JPY") ? 0.01 : 0.0001)).toFixed(1)}p</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══ DESKTOP LAYOUT ═══
  return (
    <div className={`h-screen bg-[#0d0d12] text-zinc-200 flex flex-col overflow-hidden select-none ${expanded ? "fixed inset-0 z-50" : ""}`}>
      {/* TOP BAR */}
      <header className="h-8 bg-[#111118] border-b border-zinc-800/60 flex items-center px-2 gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="w-6 h-6 text-zinc-400 hover:text-white" onClick={() => navigate("/my-accounts")}>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-4 bg-zinc-800" />
        <span className="text-[10px] font-bold text-emerald-400">{tier?.badge_icon}</span>
        <span className="text-[10px] font-semibold text-zinc-300">{tier?.tier_name}</span>
        <Badge className="text-[8px] h-4 bg-zinc-800 text-zinc-400 border-zinc-700">{propAccount?.phase}</Badge>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-zinc-500">BAL</span><span className="text-white font-bold">${propAccount?.account_balance.toFixed(2)}</span>
          <span className="text-zinc-500">EQT</span><span className={equity >= (propAccount?.account_balance || 0) ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>${equity.toFixed(2)}</span>
          <span className="text-zinc-500">P&L</span><span className={totalFloatingPnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{totalFloatingPnl >= 0 ? "+" : ""}${totalFloatingPnl.toFixed(2)}</span>
        </div>
        <div className="w-px h-4 bg-zinc-800" />
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[9px] text-emerald-400">LIVE</span></div>
        <Button variant="ghost" size="icon" className="w-5 h-5 text-zinc-500" onClick={() => setExpanded(!expanded)}>
          {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — MARKET WATCH */}
        <aside className="w-44 bg-[#0f0f16] border-r border-zinc-800/50 overflow-y-auto shrink-0 hidden lg:flex flex-col">
          <div className="p-1.5 border-b border-zinc-800/50">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Market Watch</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {symbols.map(sym => {
              const p = prices[sym];
              if (!p) return null;
              const isUp = p.change >= 0;
              const active = selectedSymbol === sym;
              return (
                <button key={sym} onClick={() => { setSelectedSymbol(sym); chartRef.current = []; }}
                  className={`w-full flex items-center justify-between px-2 py-1 text-[10px] transition-colors border-b border-zinc-800/20 ${active ? "bg-emerald-500/10 border-l-2 border-l-emerald-500" : "hover:bg-zinc-800/30"}`}>
                  <span className={`font-medium ${active ? "text-white" : "text-zinc-400"}`}>{sym}</span>
                  <div className="text-right font-mono">
                    <span className={isUp ? "text-emerald-400" : "text-red-400"}>{p.bid.toFixed(getDecimals(sym))}</span>
                    <div className={`text-[8px] ${isUp ? "text-emerald-500/70" : "text-red-500/70"}`}>{isUp ? "+" : ""}{p.changePercent}%</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER — CHART */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/50 bg-[#0f0f16]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{selectedSymbol}</span>
              {currentPrice && (
                <>
                  <span className={`text-sm font-mono font-bold ${currentPrice.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>{currentPrice.bid.toFixed(dec)}</span>
                  <span className="text-[9px] text-zinc-500">Spread: {(spread / (selectedSymbol.includes("JPY") ? 0.01 : 0.0001)).toFixed(1)}p</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setChartMode("tv")} className={`px-1.5 py-0.5 rounded text-[9px] ${chartMode === "tv" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500"}`}>TradingView</button>
              <button onClick={() => setChartMode("live")} className={`px-1.5 py-0.5 rounded text-[9px] ${chartMode === "live" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500"}`}>Live Tick</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-[#0a0a0f]">
            {chartMode === "tv" ? <TVChart symbol={tvSymbol} height={500} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs><linearGradient id="tickGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="time" tick={{ fontSize: 8, fill: "#52525b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 8, fill: "#52525b" }} tickLine={false} axisLine={false} width={55} tickFormatter={(v) => v.toFixed(dec > 3 ? 4 : 2)} />
                  <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={1.5} fill="url(#tickGrad)" dot={false} isAnimationActive={false} />
                  {openTrades.filter(t => t.symbol === selectedSymbol).map(trade => (
                    <ReferenceLine key={trade.id} y={trade.entry_price} stroke={trade.trade_type === "buy" ? "#10b981" : "#ef4444"} strokeDasharray="3 3" />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Bottom trades panel */}
          <div className="h-28 border-t border-zinc-800/50 bg-[#0f0f16] flex flex-col shrink-0">
            <div className="flex items-center gap-0.5 px-1 border-b border-zinc-800/30">
              {(["trades", "history"] as const).map(tab => (
                <button key={tab} onClick={() => setBottomTab(tab)}
                  className={`px-2 py-1 text-[9px] font-medium uppercase tracking-wider border-b-2 transition-colors ${bottomTab === tab ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500"}`}>
                  {tab === "trades" ? `Open (${openTrades.length})` : "History"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {bottomTab === "trades" ? <TradesTable /> : (
                closedTrades.length === 0 ? <div className="flex items-center justify-center h-full text-[10px] text-zinc-600">No history</div> : (
                  <table className="w-full text-[9px]">
                    <thead><tr className="text-zinc-600"><th className="text-left p-1 pl-2">Symbol</th><th className="text-left p-1">Type</th><th className="text-right p-1">Lots</th><th className="text-right p-1">Entry</th><th className="text-right p-1">Exit</th><th className="text-right p-1">P&L</th></tr></thead>
                    <tbody>{closedTrades.map((trade: any) => (
                      <tr key={trade.id} className="border-t border-zinc-800/20">
                        <td className="p-1 pl-2 text-zinc-300">{trade.symbol}</td>
                        <td className={`p-1 ${trade.trade_type === "buy" ? "text-emerald-400" : "text-red-400"}`}>{trade.trade_type?.toUpperCase()}</td>
                        <td className="p-1 text-right font-mono text-zinc-500">{trade.lot_size}</td>
                        <td className="p-1 text-right font-mono text-zinc-400">{trade.entry_price?.toFixed(getDecimals(trade.symbol))}</td>
                        <td className="p-1 text-right font-mono text-zinc-400">{trade.exit_price?.toFixed(getDecimals(trade.symbol))}</td>
                        <td className={`p-1 text-right font-mono font-bold ${(trade.profit_loss || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{(trade.profit_loss || 0) >= 0 ? "+" : ""}${(trade.profit_loss || 0).toFixed(2)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </main>

        {/* RIGHT — ORDER + RISK + STATS */}
        <aside className="w-52 bg-[#0f0f16] border-l border-zinc-800/50 overflow-y-auto shrink-0 hidden md:flex flex-col">
          <OrderPanel />
          <div className="p-2 border-t border-zinc-800/50 space-y-1">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Activity className="w-3 h-3" />Stats</p>
            {[
              { label: "Win Rate", value: `${winRate}%` },
              { label: "Total Trades", value: propAccount?.total_trades || 0 },
              { label: "W / L", value: `${propAccount?.winning_trades || 0} / ${propAccount?.losing_trades || 0}` },
              { label: "Days", value: propAccount?.trading_days || 0 },
              { label: "Realized", value: `$${propAccount?.total_pnl.toFixed(2) || "0.00"}` },
            ].map(s => (
              <div key={s.label} className="flex justify-between text-[9px]">
                <span className="text-zinc-500">{s.label}</span>
                <span className="font-mono text-zinc-300">{s.value}</span>
              </div>
            ))}
          </div>
          {tier && (
            <div className="p-2 border-t border-zinc-800/50 space-y-1">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Target className="w-3 h-3" />Rules</p>
              {[
                { label: "Daily Limit", value: `${tier.max_daily_loss_percent}%` },
                { label: "Max DD", value: `${tier.max_total_drawdown_percent}%` },
                { label: "Target", value: `${tier.profit_target_percent}%` },
                { label: "Min Days", value: tier.min_trading_days },
                { label: "Max Days", value: tier.max_trading_days },
                { label: "Split", value: `${tier.profit_split_percent}%` },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-[9px]">
                  <span className="text-zinc-500">{r.label}</span>
                  <span className="font-mono text-zinc-400">{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
