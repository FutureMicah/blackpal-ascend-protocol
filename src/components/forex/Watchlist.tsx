// Watchlist with price/% alerts. Uses existing price_alerts table from prior migration.
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FOREX_PAIRS } from "@/lib/forex-math";

interface WatchItem {
  id: string;
  symbol: string;
  alert_price: number | null;
  condition: string;
}

export const Watchlist = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [symbol, setSymbol] = useState("EURUSD");
  const [price, setPrice] = useState("");
  const [cond, setCond] = useState("above");
  const [userId, setUserId] = useState<string | null>(null);

  const load = async (uid: string) => {
    const { data } = await supabase
      .from("price_alerts")
      .select("id, symbol, alert_price, condition")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as any);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      load(user.id);
    };
    init();
  }, []);

  const add = async () => {
    if (!userId || !price) return;
    const { error } = await supabase.from("price_alerts").insert({
      user_id: userId,
      symbol,
      alert_price: parseFloat(price),
      condition: cond,
      is_active: true,
    });
    if (error) return toast({ variant: "destructive", title: "Error", description: error.message });
    toast({ title: `Alert set: ${symbol} ${cond} ${price}` });
    setPrice("");
    load(userId);
  };

  const remove = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    if (userId) load(userId);
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Star className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold">Watchlist & Alerts</h3>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1 mb-2">
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FOREX_PAIRS.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cond} onValueChange={setCond}>
          <SelectTrigger className="h-7 text-[10px] w-16"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="above" className="text-xs">≥</SelectItem>
            <SelectItem value="below" className="text-xs">≤</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-7 text-[10px]"
        />
        <Button size="icon" className="h-7 w-7" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-[9px] text-muted-foreground text-center py-2">No alerts yet</p>
        ) : (
          items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/20">
              <span className="text-[10px] font-bold font-mono">{i.symbol}</span>
              <span className="text-[9px] text-muted-foreground">{i.condition === "above" ? "≥" : "≤"}</span>
              <span className="text-[10px] font-mono flex-1">{i.alert_price}</span>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => remove(i.id)}>
                <Trash2 className="w-3 h-3 text-rose-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
