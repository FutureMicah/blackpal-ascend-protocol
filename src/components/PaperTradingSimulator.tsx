import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, 
  Plus, X, ArrowUpRight, ArrowDownRight, Wallet,
  Target, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  status: string;
  opened_at: string;
  closed_at: string | null;
}

// Mock real-time prices
const mockPrices: Record<string, number> = {
  "BTC/USD": 67543.21,
  "ETH/USD": 3521.45,
  "AAPL": 178.32,
  "TSLA": 245.67,
  "NVDA": 875.43,
  "EUR/USD": 1.0856,
  "GBP/USD": 1.2634,
  "XAU/USD": 2345.78,
};

export const PaperTradingSimulator = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // New trade form
  const [symbol, setSymbol] = useState("BTC/USD");
  const [tradeType, setTradeType] = useState("buy");
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  useEffect(() => {
    fetchPortfolio();
    fetchTrades();
  }, []);

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
      // Create default portfolio
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
    if (!portfolio || !quantity) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const price = mockPrices[symbol] || 100;
    const qty = parseFloat(quantity);
    const cost = price * qty;

    if (cost > portfolio.current_balance) {
      toast({
        title: "Insufficient funds",
        description: "You don't have enough balance for this trade",
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
        quantity: qty,
        entry_price: price,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        status: "open",
      })
      .select()
      .single();

    if (!error && data) {
      // Update portfolio balance
      await supabase
        .from("paper_portfolios")
        .update({
          current_balance: portfolio.current_balance - cost,
          total_trades: (portfolio.total_trades || 0) + 1,
        })
        .eq("id", portfolio.id);

      toast({
        title: "Trade opened! 🚀",
        description: `${tradeType.toUpperCase()} ${qty} ${symbol} @ $${price.toFixed(2)}`,
      });

      setIsNewTradeOpen(false);
      setQuantity("");
      setStopLoss("");
      setTakeProfit("");
      fetchPortfolio();
      fetchTrades();
    }
  };

  const closeTrade = async (trade: Trade) => {
    if (!portfolio) return;

    const currentPrice = mockPrices[trade.symbol] || trade.entry_price;
    const pnl = trade.trade_type === "buy" 
      ? (currentPrice - trade.entry_price) * trade.quantity
      : (trade.entry_price - currentPrice) * trade.quantity;
    const pnlPercent = (pnl / (trade.entry_price * trade.quantity)) * 100;

    const { error } = await supabase
      .from("paper_trades")
      .update({
        exit_price: currentPrice,
        profit_loss: pnl,
        profit_loss_percent: pnlPercent,
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    if (!error) {
      // Update portfolio
      const returnedAmount = currentPrice * trade.quantity;
      await supabase
        .from("paper_portfolios")
        .update({
          current_balance: portfolio.current_balance + returnedAmount,
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

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status === "closed");
  const winRate = portfolio && portfolio.total_trades > 0 
    ? ((portfolio.winning_trades || 0) / portfolio.total_trades * 100).toFixed(1)
    : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading simulator...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Wallet className="w-4 h-4" />
              Balance
            </div>
            <p className="text-2xl font-bold">${portfolio?.current_balance?.toLocaleString() || "100,000"}</p>
          </CardContent>
        </Card>

        <Card className={`border-${(portfolio?.total_profit_loss || 0) >= 0 ? 'green' : 'red'}-500/20`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {(portfolio?.total_profit_loss || 0) >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              P&L
            </div>
            <p className={`text-2xl font-bold ${(portfolio?.total_profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(portfolio?.total_profit_loss || 0) >= 0 ? "+" : ""}${(portfolio?.total_profit_loss || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              Total Trades
            </div>
            <p className="text-2xl font-bold">{portfolio?.total_trades || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Target className="w-4 h-4" />
              Win Rate
            </div>
            <p className="text-2xl font-bold">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* New Trade Button */}
      <Dialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen}>
        <DialogTrigger asChild>
          <Button className="w-full h-12 text-lg gap-2">
            <Plus className="w-5 h-5" />
            Open New Trade
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open New Trade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(mockPrices).map(s => (
                    <SelectItem key={s} value={s}>
                      {s} - ${mockPrices[s].toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trade Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={tradeType === "buy" ? "default" : "outline"}
                  onClick={() => setTradeType("buy")}
                  className={tradeType === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Buy / Long
                </Button>
                <Button
                  type="button"
                  variant={tradeType === "sell" ? "default" : "outline"}
                  onClick={() => setTradeType("sell")}
                  className={tradeType === "sell" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Sell / Short
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
              />
              {quantity && (
                <p className="text-sm text-muted-foreground">
                  Total: ${(parseFloat(quantity) * mockPrices[symbol]).toLocaleString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Stop Loss
                </Label>
                <Input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-green-500" />
                  Take Profit
                </Label>
                <Input
                  type="number"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <Button onClick={openTrade} className="w-full" disabled={!quantity}>
              Execute Trade
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trades Tabs */}
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open" className="gap-2">
            <Clock className="w-4 h-4" />
            Open ({openTrades.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Closed ({closedTrades.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3 mt-4">
          {openTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No open trades. Start trading!
            </div>
          ) : (
            openTrades.map(trade => {
              const currentPrice = mockPrices[trade.symbol] || trade.entry_price;
              const unrealizedPnl = trade.trade_type === "buy"
                ? (currentPrice - trade.entry_price) * trade.quantity
                : (trade.entry_price - currentPrice) * trade.quantity;
              
              return (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-border bg-card/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={trade.trade_type === "buy" ? "default" : "destructive"}>
                        {trade.trade_type.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{trade.symbol}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => closeTrade(trade)}>
                      Close
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">${trade.entry_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current</p>
                      <p className="font-medium">${currentPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P&L</p>
                      <p className={`font-medium ${unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-3 mt-4">
          {closedTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No closed trades yet.
            </div>
          ) : (
            closedTrades.slice(0, 10).map(trade => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border border-border bg-card/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.trade_type === "buy" ? "default" : "destructive"}>
                      {trade.trade_type.toUpperCase()}
                    </Badge>
                    <span className="font-semibold">{trade.symbol}</span>
                  </div>
                  <Badge variant={(trade.profit_loss || 0) >= 0 ? "outline" : "destructive"}>
                    {(trade.profit_loss || 0) >= 0 ? "+" : ""}${(trade.profit_loss || 0).toFixed(2)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Entry</p>
                    <p className="font-medium">${trade.entry_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exit</p>
                    <p className="font-medium">${trade.exit_price?.toLocaleString() || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Qty</p>
                    <p className="font-medium">{trade.quantity}</p>
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
