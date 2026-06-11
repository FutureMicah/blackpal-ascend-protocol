import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Activity, Loader2, Inbox, Copy, ExternalLink, Image as ImageIcon, Check } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  seen_at?: string | null;
}

const PAGE = 8;
type SortKey = "newest" | "profit" | "loss";
type FilterKey = "all" | "tp" | "sl" | "manual";

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

function extractScreenshotUrl(t: Trade): string | null {
  const c = t.comment ?? "";
  const match = c.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?/i);
  return match ? match[0] : null;
}

function readUrlTradeId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("trade");
}
function writeUrlTradeId(id: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("trade", id);
  else url.searchParams.delete("trade");
  window.history.replaceState({}, "", url.toString());
}

export function RecentTradesList({ accountId }: { accountId: string }) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selected, setSelected] = useState<Trade | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<FilterKey>("all");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingUrlTradeRef = useRef<string | null>(readUrlTradeId());

  const markSeen = useCallback(async (id: string) => {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, seen_at: t.seen_at ?? new Date().toISOString() } : t)));
    setSelected((cur) => (cur && cur.id === id ? { ...cur, seen_at: cur.seen_at ?? new Date().toISOString() } : cur));
    await supabase
      .from("prop_trades")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id)
      .is("seen_at", null);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data } = await supabase
      .from("prop_trades")
      .select("id,symbol,trade_type,lot_size,profit_loss,closed_at,opened_at,source,status,entry_price,exit_price,stop_loss,take_profit,commission,swap,mt5_ticket,comment,seen_at")
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
    setInitialLoading(false);
  }, [accountId, page, loading, hasMore]);

  useEffect(() => {
    setTrades([]);
    setPage(0);
    setHasMore(true);
    setInitialLoading(true);
  }, [accountId]);

  useEffect(() => {
    if (page === 0 && hasMore && !loading) loadMore();
  }, [page, hasMore, loading, loadMore]);

  // Open URL-pinned trade — fetch directly if not in current pages (works across refreshes/shares)
  useEffect(() => {
    const pinned = pendingUrlTradeRef.current;
    if (!pinned || selected) return;
    const found = trades.find((t) => t.id === pinned);
    if (found) {
      setSelected(found);
      markSeen(found.id);
      pendingUrlTradeRef.current = null;
      return;
    }
    if (initialLoading) return;
    (async () => {
      const { data } = await supabase
        .from("prop_trades")
        .select("id,symbol,trade_type,lot_size,profit_loss,closed_at,opened_at,source,status,entry_price,exit_price,stop_loss,take_profit,commission,swap,mt5_ticket,comment,seen_at")
        .eq("id", pinned)
        .eq("prop_account_id", accountId)
        .maybeSingle();
      if (data) {
        const t = data as Trade;
        setSelected(t);
        // splice into list if missing so user sees context
        setTrades((prev) => (prev.some((p) => p.id === t.id) ? prev : [t, ...prev]));
        markSeen(t.id);
      } else {
        toast.error("Trade not found", { description: "It may have been removed or belongs to another account." });
      }
      pendingUrlTradeRef.current = null;
    })();
  }, [trades, selected, initialLoading, accountId, markSeen]);

  // realtime inserts + updates (seen_at sync across devices)
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
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${accountId}` },
        (payload) => {
          const t = payload.new as Trade;
          setTrades((prev) => prev.map((p) => (p.id === t.id ? { ...p, ...t } : p)));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [accountId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const openTrade = useCallback((t: Trade) => {
    setSelected(t);
    writeUrlTradeId(t.id);
    if (!t.seen_at) markSeen(t.id);
  }, [markSeen]);

  const closeDrawer = useCallback(() => {
    setSelected(null);
    writeUrlTradeId(null);
  }, []);

  const filterCounts = useMemo(() => {
    const counts = { all: trades.length, tp: 0, sl: 0, manual: 0 };
    for (const t of trades) {
      const tone = ruleHit(t).tone;
      if (tone === "tp" || tone === "sl" || tone === "manual") counts[tone]++;
    }
    return counts;
  }, [trades]);

  const visibleTrades = useMemo(() => {
    const filtered = trades.filter((t) => filter === "all" ? true : ruleHit(t).tone === filter);
    const sorted = [...filtered];
    if (sort === "profit") sorted.sort((a, b) => Number(b.profit_loss ?? 0) - Number(a.profit_loss ?? 0));
    else if (sort === "loss") sorted.sort((a, b) => Number(a.profit_loss ?? 0) - Number(b.profit_loss ?? 0));
    else sorted.sort((a, b) => {
      const ad = a.closed_at ? new Date(a.closed_at).getTime() : 0;
      const bd = b.closed_at ? new Date(b.closed_at).getTime() : 0;
      return bd - ad;
    });
    return sorted;
  }, [trades, sort, filter]);

  const unseenCount = trades.filter((t) => !t.seen_at).length;
  const markAllSeen = async () => {
    const ids = trades.filter((t) => !t.seen_at).map((t) => t.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setTrades((prev) => prev.map((t) => (t.seen_at ? t : { ...t, seen_at: now })));
    await supabase.from("prop_trades").update({ seen_at: now }).in("id", ids).is("seen_at", null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          Recent closed trades
          {unseenCount > 0 && (
            <span className="px-1 py-px rounded-sm bg-primary text-primary-foreground text-[8px] font-bold tracking-wider">
              {unseenCount} NEW
            </span>
          )}
        </p>
        {unseenCount > 0 && (
          <button type="button" onClick={markAllSeen} className="text-[9px] text-primary hover:underline">
            Mark all seen
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {([
          ["all", "All", filterCounts.all],
          ["tp", "TP", filterCounts.tp],
          ["sl", "SL", filterCounts.sl],
          ["manual", "Manual", filterCounts.manual],
        ] as [FilterKey, string, number][]).map(([k, l, c]) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
            {l} <span className="opacity-70 ml-0.5">{c}</span>
          </Chip>
        ))}
        <div className="w-px h-3 bg-border mx-0.5" />
        {([
          ["newest", "Newest"],
          ["profit", "Top P/L"],
          ["loss", "Worst"],
        ] as [SortKey, string][]).map(([k, l]) => (
          <Chip key={k} active={sort === k} onClick={() => setSort(k)}>{l}</Chip>
        ))}
      </div>

      <div className="max-h-56 overflow-y-auto pr-1 -mr-1 space-y-1 scrollbar-thin">
        {initialLoading ? (
          <ul className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-2 py-1.5 rounded-md bg-muted/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-3 w-10" />
              </li>
            ))}
          </ul>
        ) : visibleTrades.length === 0 ? (
          <EmptyState hasAny={trades.length > 0} onClear={() => { setFilter("all"); setSort("newest"); }} />
        ) : (
          <ul className="space-y-1">
            {visibleTrades.map((t) => {
              const pnl = Number(t.profit_loss ?? 0);
              const positive = pnl >= 0;
              const isNew = !t.seen_at;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => openTrade(t)}
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
        )}
        <div ref={sentinelRef} className="h-4 flex items-center justify-center">
          {loading && !initialLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          {!hasMore && trades.length > 0 && (
            <span className="text-[9px] text-muted-foreground/60">End of history</span>
          )}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && closeDrawer()}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {selected && <TradeDetails trade={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-1.5 py-0.5 rounded-full text-[9px] font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ hasAny, onClear }: { hasAny: boolean; onClear: () => void }) {
  if (hasAny) {
    return (
      <div className="py-4 flex flex-col items-center text-center gap-1.5">
        <Inbox className="w-4 h-4 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground">No trades match this filter</p>
        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onClear}>Clear filters</Button>
      </div>
    );
  }
  return (
    <div className="py-5 flex flex-col items-center text-center gap-1.5">
      <div className="relative">
        <Activity className="w-5 h-5 text-muted-foreground" />
        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
      </div>
      <p className="text-[11px] font-semibold">No closed trades yet</p>
      <p className="text-[10px] text-muted-foreground max-w-[200px]">
        Once your MT5 account closes a deal it will stream here in real time.
      </p>
    </div>
  );
}

function TradeDetails({ trade }: { trade: Trade }) {
  const pnl = Number(trade.profit_loss ?? 0);
  const positive = pnl >= 0;
  const rule = ruleHit(trade);
  const fmt = (n?: number | null) => (n == null || isNaN(Number(n)) ? "—" : Number(n).toFixed(5));
  const dt = (s?: string | null) => (s ? format(new Date(s), "MMM d, HH:mm:ss") : "—");
  const screenshot = extractScreenshotUrl(trade);
  const tvSymbol = trade.symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const tvUrl = `https://www.tradingview.com/chart/?symbol=${tvSymbol}`;
  const [copied, setCopied] = useState(false);

  const copyDetails = async () => {
    const text = [
      `${trade.symbol} ${trade.trade_type.toUpperCase()} ${Number(trade.lot_size).toFixed(2)} lots`,
      `Entry: ${fmt(trade.entry_price)}`,
      `Exit:  ${fmt(trade.exit_price)}`,
      `SL:    ${fmt(trade.stop_loss)}`,
      `TP:    ${fmt(trade.take_profit)}`,
      `P&L:   ${positive ? "+" : ""}${pnl.toFixed(2)}`,
      `Opened: ${dt(trade.opened_at)}`,
      `Closed: ${dt(trade.closed_at)}`,
      trade.mt5_ticket ? `Ticket: #${trade.mt5_ticket}` : "",
      `Rule: ${rule.label}`,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Trade details copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch { /* ignore */ }
  };

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

      {/* Quick actions */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5" onClick={copyDetails}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Copy details
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5" onClick={copyLink}>
          <Copy className="w-3 h-3" /> Copy link
        </Button>
        {screenshot && (
          <Button asChild size="sm" variant="outline" className="h-7 text-[10px] gap-1.5">
            <a href={screenshot} target="_blank" rel="noreferrer">
              <ImageIcon className="w-3 h-3" /> Screenshot
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="h-7 text-[10px] gap-1.5">
          <a href={tvUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="w-3 h-3" /> Open chart
          </a>
        </Button>
      </div>

      {screenshot && (
        <a href={screenshot} target="_blank" rel="noreferrer" className="block mt-3 rounded-md overflow-hidden border border-border/50">
          <img src={screenshot} alt={`${trade.symbol} chart screenshot`} className="w-full max-h-60 object-cover" loading="lazy" />
        </a>
      )}

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
