import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Trophy, TrendingUp, TrendingDown, Scale, Flame, Snowflake,
  CalendarClock, Layers, Gauge, Sparkles, ChevronDown,
} from "lucide-react";

interface Props {
  accountId: string;
  startingBalance: number;
  maxTradingDays: number;
  tradingDays: number;
  passedAt?: string | null;
  createdAt?: string | null;
}

interface Trade {
  profit_loss: number;
  commission: number | null;
  swap: number | null;
  lot_size: number;
  closed_at: string | null;
}
interface DailyStat { trade_date: string; daily_pnl: number; daily_pnl_percent: number }

interface Metrics {
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  riskReward: number;
  bestDay: number;
  worstDay: number;
  consistency: number; // largest day / total profit %
  maxLossStreak: number;
  maxWinStreak: number;
  totalLots: number;
  totalTrades: number;
  daysRemaining: number | null;
  accountAgeDays: number;
}

function fmtMoney(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(abs >= 10000 ? 1 : 2)}k` : `$${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : s;
}

function Stat({ icon: Icon, label, value, tone = "default", hint }: {
  icon: any; label: string; value: string; tone?: "default" | "good" | "bad" | "warn"; hint?: string;
}) {
  const toneCls =
    tone === "good" ? "text-emerald-500" :
    tone === "bad"  ? "text-destructive" :
    tone === "warn" ? "text-orange-500"  : "text-foreground";
  return (
    <div className="p-1.5 rounded-md bg-muted/30 border border-border/40">
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className={cn("text-[11px] font-bold font-mono tabular-nums mt-0.5 leading-tight", toneCls)}>{value}</p>
      {hint && <p className="text-[8px] text-muted-foreground/70 leading-tight">{hint}</p>}
    </div>
  );
}

export function PropFirmMetrics({ accountId, startingBalance, maxTradingDays, tradingDays, passedAt, createdAt }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [m, setM] = useState<Metrics | null>(null);

  const compute = (trades: Trade[], stats: DailyStat[]): Metrics => {
    const closed = trades
      .filter(t => t.closed_at)
      .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime())
      .map(t => (t.profit_loss || 0) + (t.commission || 0) + (t.swap || 0));

    const wins = closed.filter(p => p > 0);
    const losses = closed.filter(p => p < 0);
    const grossWin = wins.reduce((s, p) => s + p, 0);
    const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    let curW = 0, curL = 0, maxW = 0, maxL = 0;
    for (const p of closed) {
      if (p >= 0) { curW++; curL = 0; if (curW > maxW) maxW = curW; }
      else        { curL++; curW = 0; if (curL > maxL) maxL = curL; }
    }

    const dayPnls = stats.map(s => Number(s.daily_pnl) || 0);
    const bestDay = dayPnls.length ? Math.max(...dayPnls) : 0;
    const worstDay = dayPnls.length ? Math.min(...dayPnls) : 0;
    const totalProfit = dayPnls.reduce((s, v) => s + v, 0);
    const largestPositive = Math.max(0, ...dayPnls);
    const consistency = totalProfit > 0 ? (largestPositive / totalProfit) * 100 : 0;

    const totalLots = trades.reduce((s, t) => s + (Number(t.lot_size) || 0), 0);
    const daysRemaining = maxTradingDays > 0 ? Math.max(0, maxTradingDays - tradingDays) : null;
    const ageStart = createdAt ? new Date(createdAt).getTime() : Date.now();
    const accountAgeDays = Math.max(0, Math.floor((Date.now() - ageStart) / 86400000));

    return {
      winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
      avgWin, avgLoss,
      riskReward: avgLoss > 0 ? avgWin / avgLoss : 0,
      bestDay, worstDay, consistency,
      maxLossStreak: maxL, maxWinStreak: maxW,
      totalLots, totalTrades: trades.length,
      daysRemaining, accountAgeDays,
    };
  };

  const load = async () => {
    setLoading(true);
    const [tRes, dRes] = await Promise.all([
      supabase.from("prop_trades")
        .select("profit_loss,commission,swap,lot_size,closed_at")
        .eq("prop_account_id", accountId)
        .eq("status", "closed"),
      supabase.from("prop_daily_stats")
        .select("trade_date,daily_pnl,daily_pnl_percent")
        .eq("prop_account_id", accountId),
    ]);
    setM(compute((tRes.data || []) as any, (dRes.data || []) as any));
    setLoading(false);
  };

  useEffect(() => {
    if (!open || m) return;
    load();
    const ch = supabase.channel(`metrics-${accountId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${accountId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId]);

  // consistency rule typical: keep < 40%
  const consistencyTone = m ? (m.consistency >= 40 ? "bad" : m.consistency >= 30 ? "warn" : "good") : "default";
  const pfTone = m ? (m.profitFactor >= 1.5 ? "good" : m.profitFactor >= 1 ? "warn" : "bad") : "default";
  const wrTone = m ? (m.winRate >= 55 ? "good" : m.winRate >= 40 ? "warn" : "bad") : "default";

  return (
    <div className="pt-2 border-t border-border/60">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Gauge className="w-3 h-3" /> Performance metrics
        </span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-2 animate-fade-in">
          {loading && !m ? (
            <p className="text-[10px] text-muted-foreground py-3 text-center">Loading metrics…</p>
          ) : m && m.totalTrades === 0 ? (
            <p className="text-[10px] text-muted-foreground py-3 text-center">No closed trades yet — metrics will appear after your first trade.</p>
          ) : m ? (
            <div className="grid grid-cols-3 gap-1.5">
              <Stat icon={Trophy}        label="Win rate"     value={`${m.winRate.toFixed(1)}%`} tone={wrTone} hint={`${Math.round(m.winRate * m.totalTrades / 100)}/${m.totalTrades}`} />
              <Stat icon={Scale}         label="Profit factor" value={m.profitFactor >= 99 ? "∞" : m.profitFactor.toFixed(2)} tone={pfTone} hint="gross W / L" />
              <Stat icon={Sparkles}      label="R:R avg"      value={m.riskReward > 0 ? `1:${m.riskReward.toFixed(2)}` : "—"} hint="avg win / loss" />
              <Stat icon={TrendingUp}    label="Avg win"      value={fmtMoney(m.avgWin)} tone="good" />
              <Stat icon={TrendingDown}  label="Avg loss"     value={fmtMoney(-m.avgLoss)} tone="bad" />
              <Stat icon={Gauge}         label="Consistency"  value={`${m.consistency.toFixed(0)}%`} tone={consistencyTone as any} hint="best day / total" />
              <Stat icon={TrendingUp}    label="Best day"     value={fmtMoney(m.bestDay)} tone="good" />
              <Stat icon={TrendingDown}  label="Worst day"    value={fmtMoney(m.worstDay)} tone="bad" />
              <Stat icon={Flame}         label="Win streak"   value={String(m.maxWinStreak)} tone="good" />
              <Stat icon={Snowflake}     label="Loss streak"  value={String(m.maxLossStreak)} tone={m.maxLossStreak >= 5 ? "bad" : "default"} />
              <Stat icon={Layers}        label="Total lots"   value={m.totalLots.toFixed(2)} />
              <Stat
                icon={CalendarClock}
                label="Days left"
                value={m.daysRemaining === null ? "∞" : String(m.daysRemaining)}
                tone={m.daysRemaining !== null && m.daysRemaining <= 3 ? "warn" : "default"}
                hint={`age ${m.accountAgeDays}d`}
              />
            </div>
          ) : null}

          {m && m.consistency >= 40 && (
            <div className="mt-2 p-1.5 rounded-md bg-destructive/10 border border-destructive/30 text-[9px] text-destructive">
              Consistency rule warning — one day represents over 40% of total profit. Most prop firms reject payouts above this threshold.
            </div>
          )}
          {passedAt && (
            <div className="mt-2 p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-500">
              Phase passed on {new Date(passedAt).toLocaleDateString()} — eligible for payout.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
