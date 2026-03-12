import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3,
  Plus, ArrowUpRight, ArrowDownRight, Wallet,
  Target, AlertTriangle, CheckCircle2, Clock, X,
  Activity, Zap, RefreshCw
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLivePrices, getSymbolList, type PriceData } from "@/hooks/use-live-prices";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

interface Portfolio {
  id: string;
  portfolio_name: string;
  initial_balance: number;
  current_balance: number;
  total_profit_loss: number;
  total_trades: number;
  winning_trades: number;
}

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  status: string;
  stop_loss: number | null;
  take_profit: number | null;
  opened_at: string;
  closed_at: string | null;
}

// Mini live chart component
const MiniPriceChart = ({ symbol, prices }: { symbol: string; prices: Record<string, PriceData> }) => {
  const [history, setHistory] = useState<{ time: string; price: number }[]>([]);

  useEffect(() => {
    const price = prices[symbol];
    if (!price) return;
    setHistory(prev => {
      const next = [...prev, { time: new Date().toLocaleTimeString(), price: price.bid }];
      return next.slice(-60); // Keep last 60 data points
    });
  }, [prices, symbol]);

  if (history.length < 2) return null;

  const isUp = history[history.length - 1]?.price >= history[0]?.price;

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={isUp ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
          <XAxis dataKey="time" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Price ticker component with flash animation
const PriceTicker = ({ data }: { data: PriceData }) => {
  const direction = data.prevBid !== undefined
    ? data.bid > data.prevBid ? "up" : data.bid < data.prevBid ? "down" : "flat"
    : "flat";

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <span className={cn(
          "text-lg font-mono font-bold transition-colors duration-300",
          direction === "up" && "text-green-500",
          direction === "down" && "text-red-500",
          direction === "flat" && "text-foreground"
        )}>
          {data.bid}
        </span>
        <span className="text-xs text-muted-foreground font-mono">{data.ask}</span>
      </div>
      <div className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        data.change >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
      )}>
        {data.change >= 0 ? "+" : ""}{data.changePercent}%
      </div>
    </div>
  );
};

export const PaperTradingSimulator = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState("EUR/USD");
  const { toast } = useToast();

  const allSymbols = useMemo(() => getSymbolList(), []);
  const prices = useLivePrices(allSymbols, 1000);

  // Trade form state
  const [symbol, setSymbol] = useState("EUR/USD");
  const [tradeType, setTradeType] = useState("buy");
  const [lotSize, setLotSize] = useState("0.01");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  useEffect(() => {
    fetchPortfolio();
    fetchTrades();
  }, []);

  // Auto SL/TP checker
  useEffect(() => {
    if (!portfolio || Object.keys(prices).length === 0) return;
    
    const openTrades = trades.filter(t => t.status === "open");
    for (const trade of openTrades) {
      const price = prices[trade.symbol];
      if (!price) continue;

      const currentPrice = trade.trade_type === "buy" ? price.bid : price.ask;

      // Check Stop Loss
      if (trade.stop_loss) {
        if (trade.trade_type === "buy" && currentPrice <= trade.stop_loss) {
          autoCloseTrade(trade, currentPrice, "Stop Loss hit");
          continue;
        }
        if (trade.trade_type === "sell" && currentPrice >= trade.stop_loss) {
          autoCloseTrade(trade, currentPrice, "Stop Loss hit");
          continue;
        }
      }

      // Check Take Profit
      if (trade.take_profit) {
        if (trade.trade_type === "buy" && currentPrice >= trade.take_profit) {
          autoCloseTrade(trade, currentPrice, "Take Profit hit");
          continue;
        }
        if (trade.trade_type === "sell" && currentPrice <= trade.take_profit) {
          autoCloseTrade(trade, currentPrice, "Take Profit hit");
          continue;
        }
      }
    }
  }, [prices, trades, portfolio]);

  const fetchPortfolio = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("paper_portfolios")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching portfolio:", error);
    }

    if (data) {
      setPortfolio(data);
    } else {
      const { data: newPortfolio, error: createError } = await supabase
        .from("paper_portfolios")
        .insert({
          user_id: user.id,
          portfolio_name: "Main Portfolio",
          initial_balance: 100000,
          current_balance: 100000,
        })
        .select()
        .single();

      if (!createError && newPortfolio) {
        setPortfolio(newPortfolio);
      }
    }
    setLoading(false);
  };

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("paper_trades")
      .select("*")
      .eq("user_id", user.id)
      .order("opened_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setTrades(data);
    }
  };

  const openTrade = async () => {
    if (!portfolio || !lotSize) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const price = prices[symbol];
    if (!price) return;

    const entryPrice = tradeType === "buy" ? price.ask : price.bid;
    const lots = parseFloat(lotSize);
    // Standard lot = 100,000 units, margin ~1% (100:1 leverage)
    const marginRequired = entryPrice * lots * 100000 * 0.01;

    if (marginRequired > portfolio.current_balance) {
      toast({
        title: "Insufficient margin",
        description: `Required: $${marginRequired.toFixed(2)}, Available: $${portfolio.current_balance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("paper_trades")
      .insert({
        portfolio_id: portfolio.id,
        user_id: user.id,
        symbol,
        trade_type: tradeType,
        quantity: lots,
        entry_price: entryPrice,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        status: "open",
      })
      .select()
      .single();

    if (!error && data) {
      // Deduct margin from balance
      await supabase
        .from("paper_portfolios")
        .update({
          current_balance: portfolio.current_balance - marginRequired,
          total_trades: (portfolio.total_trades || 0) + 1,
        })
        .eq("id", portfolio.id);

      toast({
        title: "Trade opened! 🚀",
        description: `${tradeType.toUpperCase()} ${lots} lot ${symbol} @ ${entryPrice}`,
      });

      setIsNewTradeOpen(false);
      setLotSize("0.01");
      setStopLoss("");
      setTakeProfit("");
      fetchPortfolio();
      fetchTrades();
    }
  };

  const autoCloseTrade = async (trade: Trade, closePrice: number, reason: string) => {
    if (!portfolio) return;

    const pnl = trade.trade_type === "buy"
      ? (closePrice - trade.entry_price) * trade.quantity * 100000
      : (trade.entry_price - closePrice) * trade.quantity * 100000;
    const pnlPercent = (pnl / (trade.entry_price * trade.quantity * 100000)) * 100;

    const { error } = await supabase
      .from("paper_trades")
      .update({
        exit_price: closePrice,
        profit_loss: parseFloat(pnl.toFixed(2)),
        profit_loss_percent: parseFloat(pnlPercent.toFixed(2)),
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    if (!error) {
      const marginReturn = trade.entry_price * trade.quantity * 100000 * 0.01;
      await supabase
        .from("paper_portfolios")
        .update({
          current_balance: portfolio.current_balance + marginReturn + pnl,
          total_profit_loss: (portfolio.total_profit_loss || 0) + pnl,
          winning_trades: pnl > 0 ? (portfolio.winning_trades || 0) + 1 : portfolio.winning_trades,
        })
        .eq("id", portfolio.id);

      toast({
        title: `${reason} ⚡`,
        description: `${trade.symbol}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
        variant: pnl >= 0 ? "default" : "destructive",
      });

      fetchPortfolio();
      fetchTrades();
    }
  };

  const closeTrade = async (trade: Trade) => {
    if (!portfolio) return;

    const price = prices[trade.symbol];
    if (!price) return;

    const closePrice = trade.trade_type === "buy" ? price.bid : price.ask;
    const pnl = trade.trade_type === "buy"
      ? (closePrice - trade.entry_price) * trade.quantity * 100000
      : (trade.entry_price - closePrice) * trade.quantity * 100000;
    const pnlPercent = (pnl / (trade.entry_price * trade.quantity * 100000)) * 100;

    const { error } = await supabase
      .from("paper_trades")
      .update({
        exit_price: closePrice,
        profit_loss: parseFloat(pnl.toFixed(2)),
        profit_loss_percent: parseFloat(pnlPercent.toFixed(2)),
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    if (!error) {
      const marginReturn = trade.entry_price * trade.quantity * 100000 * 0.01;
      await supabase
        .from("paper_portfolios")
        .update({
          current_balance: portfolio.current_balance + marginReturn + pnl,
          total_profit_loss: (portfolio.total_profit_loss || 0) + pnl,
          winning_trades: pnl > 0 ? (portfolio.winning_trades || 0) + 1 : portfolio.winning_trades,
        })
        .eq("id", portfolio.id);

      toast({
        title: pnl >= 0 ? "Trade closed with profit! 💰" : "Trade closed with loss 📉",
        description: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`,
      });

      fetchPortfolio();
      fetchTrades();
    }
  };

  const resetPortfolio = async () => {
    if (!portfolio) return;
    
    // Close all open trades first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("paper_trades")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "open");

    await supabase
      .from("paper_portfolios")
      .update({
        current_balance: 100000,
        total_profit_loss: 0,
        total_trades: 0,
        winning_trades: 0,
      })
      .eq("id", portfolio.id);

    toast({ title: "Portfolio reset to $100,000 ✅" });
    fetchPortfolio();
    fetchTrades();
  };

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status === "closed");
  const winRate = portfolio && portfolio.total_trades > 0
    ? ((portfolio.winning_trades || 0) / portfolio.total_trades * 100).toFixed(1)
    : "0.0";

  // Calculate total equity (balance + unrealized P&L)
  const unrealizedPnl = openTrades.reduce((acc, trade) => {
    const price = prices[trade.symbol];
    if (!price) return acc;
    const cp = trade.trade_type === "buy" ? price.bid : price.ask;
    return acc + (trade.trade_type === "buy"
      ? (cp - trade.entry_price) * trade.quantity * 100000
      : (trade.entry_price - cp) * trade.quantity * 100000);
  }, 0);

  const equity = (portfolio?.current_balance || 0) + unrealizedPnl;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-6 h-6 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Wallet className="w-3.5 h-3.5" /> Balance
            </div>
            <p className="text-lg font-bold font-mono">${portfolio?.current_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "100,000.00"}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Zap className="w-3.5 h-3.5" /> Equity
            </div>
            <p className="text-lg font-bold font-mono">${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              {(portfolio?.total_profit_loss || 0) >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              Realized P&L
            </div>
            <p className={cn("text-lg font-bold font-mono", (portfolio?.total_profit_loss || 0) >= 0 ? "text-green-500" : "text-red-500")}>
              {(portfolio?.total_profit_loss || 0) >= 0 ? "+" : ""}${(portfolio?.total_profit_loss || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Trades
            </div>
            <p className="text-lg font-bold">{portfolio?.total_trades || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Target className="w-3.5 h-3.5" /> Win Rate
            </div>
            <p className="text-lg font-bold">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Watchlist + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Watchlist */}
        <Card className="lg:col-span-1">
          <CardContent className="p-3">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Market Watch</h3>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {allSymbols.map(sym => {
                const p = prices[sym];
                if (!p) return null;
                const isSelected = sym === selectedSymbol;
                return (
                  <button
                    key={sym}
                    onClick={() => setSelectedSymbol(sym)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors",
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                    )}
                  >
                    <div>
                      <span className="font-semibold text-sm">{sym}</span>
                      <div className={cn(
                        "text-xs",
                        p.change >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {p.change >= 0 ? "+" : ""}{p.changePercent}%
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-mono text-sm font-bold transition-colors",
                        p.prevBid !== undefined && p.bid > p.prevBid && "text-green-500",
                        p.prevBid !== undefined && p.bid < p.prevBid && "text-red-500",
                      )}>
                        {p.bid}
                      </span>
                      <div className="text-xs text-muted-foreground font-mono">{p.ask}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart + Actions */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{selectedSymbol}</h3>
                {prices[selectedSymbol] && <PriceTicker data={prices[selectedSymbol]} />}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={resetPortfolio}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
                <Dialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { setSymbol(selectedSymbol); setIsNewTradeOpen(true); }}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> New Trade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Open Trade</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Symbol</Label>
                        <Select value={symbol} onValueChange={setSymbol}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {allSymbols.map(s => (
                              <SelectItem key={s} value={s}>
                                {s} — {prices[s]?.bid || "..."}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Direction</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={tradeType === "buy" ? "default" : "outline"}
                            onClick={() => setTradeType("buy")}
                            className={tradeType === "buy" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                          >
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                            BUY {prices[symbol]?.ask || ""}
                          </Button>
                          <Button
                            type="button"
                            variant={tradeType === "sell" ? "default" : "outline"}
                            onClick={() => setTradeType("sell")}
                            className={tradeType === "sell" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                          >
                            <ArrowDownRight className="w-4 h-4 mr-1" />
                            SELL {prices[symbol]?.bid || ""}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Lot Size</Label>
                        <div className="flex gap-2">
                          {["0.01", "0.1", "0.5", "1.0"].map(size => (
                            <Button
                              key={size}
                              type="button"
                              size="sm"
                              variant={lotSize === size ? "default" : "outline"}
                              onClick={() => setLotSize(size)}
                              className="flex-1"
                            >
                              {size}
                            </Button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          value={lotSize}
                          onChange={(e) => setLotSize(e.target.value)}
                          placeholder="Custom lot size"
                          step="0.01"
                          min="0.01"
                        />
                        {lotSize && prices[symbol] && (
                          <p className="text-xs text-muted-foreground">
                            Margin required: ${(prices[symbol].ask * parseFloat(lotSize || "0") * 100000 * 0.01).toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" /> Stop Loss
                          </Label>
                          <Input
                            type="number"
                            value={stopLoss}
                            onChange={(e) => setStopLoss(e.target.value)}
                            placeholder="Price"
                            step="0.00001"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Target className="w-3 h-3 text-green-500" /> Take Profit
                          </Label>
                          <Input
                            type="number"
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(e.target.value)}
                            placeholder="Price"
                            step="0.00001"
                          />
                        </div>
                      </div>

                      <Button onClick={openTrade} className="w-full" disabled={!lotSize || parseFloat(lotSize) <= 0}>
                        Execute Trade
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Live Chart */}
            <MiniPriceChart symbol={selectedSymbol} prices={prices} />

            {/* Quick trade buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => { setSymbol(selectedSymbol); setTradeType("buy"); setIsNewTradeOpen(true); }}
              >
                <ArrowUpRight className="w-4 h-4 mr-1" />
                BUY {prices[selectedSymbol]?.ask || ""}
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { setSymbol(selectedSymbol); setTradeType("sell"); setIsNewTradeOpen(true); }}
              >
                <ArrowDownRight className="w-4 h-4 mr-1" />
                SELL {prices[selectedSymbol]?.bid || ""}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open & Closed Trades */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Open ({openTrades.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            History ({closedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-2 mt-3">
          {openTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No open positions. Click "New Trade" to start.
            </div>
          ) : (
            openTrades.map(trade => {
              const price = prices[trade.symbol];
              const cp = price ? (trade.trade_type === "buy" ? price.bid : price.ask) : trade.entry_price;
              const pnl = trade.trade_type === "buy"
                ? (cp - trade.entry_price) * trade.quantity * 100000
                : (trade.entry_price - cp) * trade.quantity * 100000;

              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl border border-border bg-card/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={trade.trade_type === "buy" ? "default" : "destructive"} className="text-xs">
                        {trade.trade_type.toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-sm">{trade.symbol}</span>
                      <span className="text-xs text-muted-foreground">{trade.quantity} lot</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => closeTrade(trade)} className="h-7 text-xs">
                      Close
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-mono font-medium">{trade.entry_price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current</p>
                      <p className="font-mono font-medium">{cp}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">SL / TP</p>
                      <p className="font-mono font-medium">
                        {trade.stop_loss || "—"} / {trade.take_profit || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P&L</p>
                      <p className={cn("font-mono font-bold", pnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-2 mt-3">
          {closedTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No trade history yet.</div>
          ) : (
            closedTrades.slice(0, 20).map(trade => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl border border-border bg-card/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.trade_type === "buy" ? "default" : "destructive"} className="text-xs">
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                    <span className="font-semibold text-sm">{trade.symbol}</span>
                    <span className="text-xs text-muted-foreground">{trade.quantity} lot</span>
                  </div>
                  <Badge variant={(trade.profit_loss || 0) >= 0 ? "outline" : "destructive"} className="text-xs">
                    {(trade.profit_loss || 0) >= 0 ? "+" : ""}${(trade.profit_loss || 0).toFixed(2)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Entry</p>
                    <p className="font-mono">{trade.entry_price}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exit</p>
                    <p className="font-mono">{trade.exit_price || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Closed</p>
                    <p className="font-mono">{trade.closed_at ? new Date(trade.closed_at).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
