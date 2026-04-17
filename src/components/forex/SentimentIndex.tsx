// Trader sentiment poll: vote long/short on a pair, see community %.
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FOREX_PAIRS } from "@/lib/forex-math";

export const SentimentIndex = () => {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("EURUSD");
  const [longCount, setLongCount] = useState(0);
  const [shortCount, setShortCount] = useState(0);
  const [myVote, setMyVote] = useState<"long" | "short" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("trader_sentiment")
      .select("direction, user_id")
      .eq("symbol", symbol)
      .eq("vote_date", today);
    const longs = data?.filter((d) => d.direction === "long").length ?? 0;
    const shorts = data?.filter((d) => d.direction === "short").length ?? 0;
    setLongCount(longs);
    setShortCount(shorts);
    if (userId) {
      const mine = data?.find((d) => d.user_id === userId);
      setMyVote((mine?.direction as any) ?? null);
    }
  };

  useEffect(() => {
    load();
  }, [symbol, userId]);

  const vote = async (dir: "long" | "short") => {
    if (!userId) return toast({ variant: "destructive", title: "Sign in to vote" });
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("trader_sentiment")
      .upsert(
        { user_id: userId, symbol, direction: dir, vote_date: today },
        { onConflict: "user_id,symbol,vote_date" }
      );
    if (error) return toast({ variant: "destructive", title: "Error", description: error.message });
    toast({ title: `Voted ${dir.toUpperCase()}` });
    load();
  };

  const total = longCount + shortCount;
  const longPct = total ? Math.round((longCount / total) * 100) : 50;
  const shortPct = 100 - longPct;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-xs font-bold">Trader Sentiment</h3>
        </div>
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FOREX_PAIRS.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="h-5 rounded-full overflow-hidden flex bg-muted/30 mb-2">
        <div className="bg-emerald-500 flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${longPct}%` }}>
          {longPct > 10 && `${longPct}%`}
        </div>
        <div className="bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${shortPct}%` }}>
          {shortPct > 10 && `${shortPct}%`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          size="sm"
          variant={myVote === "long" ? "default" : "outline"}
          className="h-7 text-[10px] gap-1"
          onClick={() => vote("long")}
        >
          <TrendingUp className="w-3 h-3" /> Long ({longCount})
        </Button>
        <Button
          size="sm"
          variant={myVote === "short" ? "default" : "outline"}
          className="h-7 text-[10px] gap-1"
          onClick={() => vote("short")}
        >
          <TrendingDown className="w-3 h-3" /> Short ({shortCount})
        </Button>
      </div>
      <p className="text-[8px] text-muted-foreground mt-1.5 text-center">
        {total} traders voted today on {symbol}
      </p>
    </Card>
  );
};
