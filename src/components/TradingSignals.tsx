import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Target, Clock, Users, 
  ThumbsUp, Copy, Check, AlertTriangle, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Signal {
  id: string;
  creator: string;
  symbol: string;
  type: "LONG" | "SHORT";
  entry: number;
  target: number;
  stopLoss: number;
  confidence: number;
  timeframe: string;
  analysis: string;
  followers: number;
  status: "active" | "hit_target" | "stopped_out";
  createdAt: Date;
}

const mockSignals: Signal[] = [
  {
    id: "1",
    creator: "CryptoKing",
    symbol: "BTC/USD",
    type: "LONG",
    entry: 43500,
    target: 45000,
    stopLoss: 42500,
    confidence: 85,
    timeframe: "4H",
    analysis: "Strong support at 43K with bullish divergence on RSI. Looking for continuation to previous high.",
    followers: 234,
    status: "active",
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: "2",
    creator: "ForexMaster",
    symbol: "EUR/USD",
    type: "SHORT",
    entry: 1.0850,
    target: 1.0750,
    stopLoss: 1.0900,
    confidence: 72,
    timeframe: "1D",
    analysis: "Double top pattern forming with bearish engulfing on daily. USD strength expected.",
    followers: 156,
    status: "active",
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: "3",
    creator: "StockWhiz",
    symbol: "TSLA",
    type: "LONG",
    entry: 245,
    target: 265,
    stopLoss: 235,
    confidence: 68,
    timeframe: "1W",
    analysis: "Breaking out of consolidation with increasing volume. Earnings catalyst ahead.",
    followers: 89,
    status: "hit_target",
    createdAt: new Date(Date.now() - 86400000),
  },
];

export const TradingSignals = () => {
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [followedSignals, setFollowedSignals] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const followSignal = (signalId: string) => {
    setFollowedSignals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(signalId)) {
        newSet.delete(signalId);
        toast({ title: "Unfollowed signal" });
      } else {
        newSet.add(signalId);
        toast({ title: "Following signal!", description: "You'll be notified of updates." });
      }
      return newSet;
    });
  };

  const copySignal = (signal: Signal) => {
    const text = `${signal.symbol} ${signal.type}\nEntry: ${signal.entry}\nTarget: ${signal.target}\nStop Loss: ${signal.stopLoss}\nConfidence: ${signal.confidence}%`;
    navigator.clipboard.writeText(text);
    setCopiedId(signal.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Signal copied!" });
  };

  const getStatusColor = (status: Signal["status"]) => {
    switch (status) {
      case "active": return "bg-blue-500/20 text-blue-500";
      case "hit_target": return "bg-green-500/20 text-green-500";
      case "stopped_out": return "bg-red-500/20 text-red-500";
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Trading Signals
          </h2>
          <p className="text-sm text-muted-foreground">Follow top traders' calls</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>Share Signal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Trading Signal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Symbol</label>
                  <Input placeholder="BTC/USD" />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="outline" className="flex-1">LONG</Button>
                    <Button size="sm" variant="outline" className="flex-1">SHORT</Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Entry</label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Target</label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-sm font-medium">Stop Loss</label>
                  <Input type="number" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Analysis</label>
                <Textarea placeholder="Explain your trade setup..." rows={3} />
              </div>
              <Button className="w-full" onClick={() => setShowCreate(false)}>
                Publish Signal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Signal Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {signals.map((signal, i) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">
                        {signal.creator[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{signal.creator}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(signal.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(signal.status)}>
                      {signal.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Signal Details */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{signal.symbol}</span>
                      <Badge className={signal.type === "LONG" ? "bg-green-500" : "bg-red-500"}>
                        {signal.type === "LONG" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {signal.type}
                      </Badge>
                    </div>
                    <Badge variant="outline">{signal.timeframe}</Badge>
                  </div>

                  {/* Price Levels */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Entry</p>
                      <p className="font-bold">${signal.entry.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <p className="text-xs text-green-500">Target</p>
                      <p className="font-bold text-green-500">${signal.target.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10">
                      <p className="text-xs text-red-500">Stop Loss</p>
                      <p className="font-bold text-red-500">${signal.stopLoss.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-semibold">{signal.confidence}%</span>
                    </div>
                    <Progress value={signal.confidence} className="h-2" />
                  </div>

                  {/* Analysis */}
                  <p className="text-sm text-muted-foreground mb-4">{signal.analysis}</p>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{signal.followers} followers</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={followedSignals.has(signal.id) ? "default" : "outline"}
                        onClick={() => followSignal(signal.id)}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {followedSignals.has(signal.id) ? "Following" : "Follow"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copySignal(signal)}
                      >
                        {copiedId === signal.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Disclaimer */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-500">Trading signals are not financial advice</p>
            <p className="text-muted-foreground">Always do your own research and manage your risk. Past performance doesn't guarantee future results.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
