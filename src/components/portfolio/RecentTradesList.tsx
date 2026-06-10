import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  lot_size: number;
  profit_loss: number | null;
  closed_at: string | null;
  opened_at: string;
  source: string | null;
  status?: string | null;
}

export function RecentTradesList({ accountId, limit = 6 }: { accountId: string; limit?: number }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("prop_trades")
        .select("id,symbol,trade_type,lot_size,profit_loss,closed_at,opened_at,source")
        .eq("prop_account_id", accountId)
        .eq("status", "closed")
        .order("closed_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (mounted) setTrades((data as Trade[]) ?? []);
    };
    load();

    const ch = supabase
      .channel(`trades-${accountId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${accountId}` },
        (payload) => {
          const t = payload.new as Trade;
          if (t.status && t.status !== "closed") return;
          setTrades((prev) => [t, ...prev].slice(0, limit));
          setHighlightIds((prev) => new Set(prev).add(t.id));
          setTimeout(() => {
            setHighlightIds((prev) => {
              const next = new Set(prev);
              next.delete(t.id);
              return next;
            });
          }, 2500);
        },
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [accountId, limit]);

  if (trades.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 py-2">
        <Activity className="w-3 h-3" /> No closed trades yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent closed trades</p>
      <ul className="space-y-1">
        {trades.map((t) => {
          const pnl = Number(t.profit_loss ?? 0);
          const positive = pnl >= 0;
          const isNew = highlightIds.has(t.id);
          return (
            <li
              key={t.id}
              className={cn(
                "flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[10px] transition-all duration-500",
                isNew
                  ? "bg-primary/15 ring-1 ring-primary/40 animate-fade-in"
                  : "bg-muted/40 hover:bg-muted/60",
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {positive ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-destructive shrink-0" />
                )}
                <span className="font-mono font-semibold truncate">{t.symbol}</span>
                <span className="text-muted-foreground uppercase">{t.trade_type}</span>
                <span className="text-muted-foreground">· {Number(t.lot_size).toFixed(2)} lot</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn("font-mono font-semibold", positive ? "text-emerald-500" : "text-destructive")}>
                  {positive ? "+" : ""}
                  {pnl.toFixed(2)}
                </span>
                <span className="text-muted-foreground hidden xs:inline">
                  {t.closed_at ? formatDistanceToNow(new Date(t.closed_at), { addSuffix: true }) : "open"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
