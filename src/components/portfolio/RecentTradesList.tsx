import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Activity, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  lot_size: number;
  profit_loss: number | null;
  closed_at: string | null;
  opened_at: string;
  source: string | null;
  status?: string | null;
  entry_price?: number | null;
  exit_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  commission?: number | null;
  swap?: number | null;
  mt5_ticket?: number | null;
  comment?: string | null;
}

const PAGE = 8;

function ruleHit(t: Trade): { label: string; tone: "sl" | "tp" | "manual" | "open" } {
  if (!t.closed_at) return { label: "Position open", tone: "open" };
  const exit = Number(t.exit_price ?? 0);
  const sl = t.stop_loss ? Number(t.stop_loss) : null;
  const tp = t.take_profit ? Number(t.take_profit) : null;
  const within = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-9, Math.abs(b)) < 0.0005;
  if (sl && within(exit, sl)) return { label: "Stopped out (SL)", tone: "sl" };
  if (tp && within(exit, tp)) return { label: "Take profit hit (TP)", tone: "tp" };
  if (t.comment?.toLowerCase().includes("sl")) return { label: "Stopped out (SL)", tone: "sl" };
  if (t.comment?.toLowerCase().includes("tp")) return { label: "Take profit hit (TP)", tone: "tp" };
  return { label: (t.profit_loss ?? 0) >= 0 ? "Closed manually (win)" : "Closed manually (loss)", tone: "manual" };
}

export function RecentTradesList({ accountId }: { accountId: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Trade | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data } = await supabase
      .from("prop_trades")
      .select("id,symbol,trade_type,lot_size,profit_loss,closed_at,opened_at,source,status,entry_price,exit_price,stop_loss,take_profit,commission,swap,mt5_ticket,comment")
      .eq("prop_account_id", accountId)
      .eq("status", "closed")
      .order("closed_at", { ascending: false, nullsFirst: false })
      .range(from, to);
    const rows = (data as Trade[]) ?? [];
    setTrades((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setHasMore(rows.length === PAGE);
    setPage((p) => p + 1);
    setLoading(false);
  }, [accountId, page, loading, hasMore]);

  // initial load + reset when account changes
  useEffect(() => {
    setTrades([]);
    setPage(0);
    setHasMore(true);
  }, [accountId]);

  useEffect(() => {
    if (page === 0 && hasMore && !loading) loadMore();
  }, [page, hasMore, loading, loadMore]);

  // realtime inserts
  useEffect(() => {
    const ch = supabase
      .channel(`trades-${accountId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${accountId}` },
        (payload) => {
          const t = payload.new as Trade;
          if (t.status && t.status !== "closed") return;
          setTrades((prev) => (prev.some((p) => p.id === t.id) ? prev : [t, ...prev]));
          setHighlightIds((prev) => new Set(prev).add(t.id));
          setTimeout(() => {
            setHighlightIds((prev) => {
              const next = new Set(prev);
              next.delete(t.id);
              return next;
            });
          }, 4000);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [accountId]);

  // infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (trades.length === 0 && !loading) {
    return (
      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 py-2">
        <Activity className="w-3 h-3" /> No closed trades yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Recent closed trades
      </p>
      <div className="max-h-56 overflow-y-auto pr-1 -mr-1 space-y-1 scrollbar-thin">
        <ul className="space-y-1">
          {trades.map((t) => {
            const pnl = Number(t.profit_loss ?? 0);
            const positive = pnl >= 0;
            const isNew = highlightIds.has(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelected(t)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[10px] text-left transition-all duration-500",
                    isNew
                      ? "bg-primary/15 ring-1 ring-primary/60 shadow-[0_0_18px_-2px_hsl(var(--primary)/0.6)] animate-fade-in"
                      : "bg-muted/40 hover:bg-muted/70 active:scale-[0.99]",
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
                    <span className="text-muted-foreground hidden xs:inline">· {Number(t.lot_size).toFixed(2)}</span>
                    {isNew && (
                      <span className="ml-1 px-1 py-px rounded-sm bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn("font-mono font-semibold", positive ? "text-emerald-500" : "text-destructive")}>
                      {positive ? "+" : ""}
                      {pnl.toFixed(2)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <div ref={sentinelRef} className="h-4 flex items-center justify-center">
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          {!hasMore && trades.length > 0 && (
            <span className="text-[9px] text-muted-foreground/60">End of history</span>
          )}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {selected && <TradeDetails trade={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TradeDetails({ trade }: { trade: Trade }) {
  const pnl = Number(trade.profit_loss ?? 0);
  const positive = pnl >= 0;
  const rule = ruleHit(trade);
  const fmt = (n?: number | null) => (n == null || isNaN(Number(n)) ? "—" : Number(n).toFixed(5));
  const dt = (s?: string | null) => (s ? format(new Date(s), "MMM d, HH:mm:ss") : "—");

  return (
    <>
      <SheetHeader className="text-left">
        <SheetTitle className="flex items-center gap-2 flex-wrap">
          {positive ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-destructive" />
          )}
          <span className="font-mono">{trade.symbol}</span>
          <Badge variant="outline" className="uppercase text-[10px]">{trade.trade_type}</Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              rule.tone === "tp" && "border-emerald-500/40 text-emerald-500",
              rule.tone === "sl" && "border-destructive/40 text-destructive",
              rule.tone === "manual" && "text-muted-foreground",
            )}
          >
            {rule.label}
          </Badge>
        </SheetTitle>
        <SheetDescription className="text-xs">
          {trade.mt5_ticket ? `Ticket #${trade.mt5_ticket} · ` : ""}
          {trade.source ?? "manual"} · {trade.closed_at ? formatDistanceToNow(new Date(trade.closed_at), { addSuffix: true }) : "open"}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Stat label="Entry price" value={fmt(trade.entry_price)} />
        <Stat label="Exit price" value={fmt(trade.exit_price)} />
        <Stat label="Stop loss" value={fmt(trade.stop_loss)} />
        <Stat label="Take profit" value={fmt(trade.take_profit)} />
        <Stat label="Lot size" value={Number(trade.lot_size).toFixed(2)} />
        <Stat
          label="P&L"
          value={`${positive ? "+" : ""}${pnl.toFixed(2)}`}
          tone={positive ? "pos" : "neg"}
        />
        <Stat label="Commission" value={fmt(trade.commission)} />
        <Stat label="Swap" value={fmt(trade.swap)} />
        <Stat label="Opened" value={dt(trade.opened_at)} />
        <Stat label="Closed" value={dt(trade.closed_at)} />
      </div>

      {trade.comment && (
        <div className="mt-4 p-2 rounded-md bg-muted/50 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Note: </span>
          {trade.comment}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="p-2 rounded-md bg-muted/40 border border-border/50">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        "font-mono font-semibold tabular-nums mt-0.5",
        tone === "pos" && "text-emerald-500",
        tone === "neg" && "text-destructive",
      )}>{value}</p>
    </div>
  );
}
