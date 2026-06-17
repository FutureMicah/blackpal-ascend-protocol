import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Trophy, TrendingUp, TrendingDown, Scale, Flame, Snowflake,
  CalendarClock, Layers, Gauge, Sparkles, ChevronDown, Activity,
  Waves, Timer, Sigma, Pencil, Check, X,
} from "lucide-react";

interface Props {
  accountId: string;
  startingBalance: number;
  maxTradingDays: number;
  tradingDays: number;
  passedAt?: string | null;
  createdAt?: string | null;
  consistencyThreshold?: number;
  onThresholdChange?: (next: number) => void;
}

interface Trade {
  profit_loss: number;
  commission: number | null;
  swap: number | null;
  lot_size: number;
  closed_at: string | null;
  opened_at: string | null;
}
interface DailyStat { trade_date: string; daily_pnl: number; daily_pnl_percent: number; account_balance: number }

interface Metrics {
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  riskReward: number;
  bestDay: number;
  worstDay: number;
  consistency: number;
  maxLossStreak: number;
  maxWinStreak: number;
  totalLots: number;
  totalTrades: number;
  daysRemaining: number | null;
  accountAgeDays: number;
  // New risk metrics
  maxDrawdownPct: number;        // peak-to-trough on equity curve, %
  volatilityPct: number;          // stdev of daily % returns (annualized? keep daily)
  recoveryDays: number | null;    // days from worst trough back to peak (null if not recovered)
  rMultBuckets: { label: string; count: number; tone: "good" | "bad" | "warn" | "default" }[];
  avgR: number;
  expectancy: number;             // avg $ per trade
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

export function PropFirmMetrics({
  accountId, startingBalance, maxTradingDays, tradingDays, passedAt, createdAt,
  consistencyThreshold = 40, onThresholdChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [m, setM] = useState<Metrics | null>(null);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdDraft, setThresholdDraft] = useState(String(consistencyThreshold));
  const [savingThreshold, setSavingThreshold] = useState(false);

  useEffect(() => { setThresholdDraft(String(consistencyThreshold)); }, [consistencyThreshold]);

  const compute = (trades: Trade[], stats: DailyStat[]): Metrics => {
    const closed = trades
      .filter(t => t.closed_at)
      .sort((a, b) => new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime());
    const pnls = closed.map(t => (t.profit_loss || 0) + (t.commission || 0) + (t.swap || 0));

    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const grossWin = wins.reduce((s, p) => s + p, 0);
    const grossLoss = Math.abs(losses.reduce((s, p) => s + p, 0));
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    let curW = 0, curL = 0, maxW = 0, maxL = 0;
    for (const p of pnls) {
      if (p >= 0) { curW++; curL = 0; if (curW > maxW) maxW = curW; }
      else        { curL++; curW = 0; if (curL > maxL) maxL = curL; }
    }

    // Daily-based stats sorted by date
    const sortedDays = [...stats].sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    const dayPnls = sortedDays.map(s => Number(s.daily_pnl) || 0);
    const bestDay = dayPnls.length ? Math.max(...dayPnls) : 0;
    const worstDay = dayPnls.length ? Math.min(...dayPnls) : 0;
    const totalProfit = dayPnls.reduce((s, v) => s + v, 0);
    const largestPositive = Math.max(0, ...dayPnls);
    const consistency = totalProfit > 0 ? (largestPositive / totalProfit) * 100 : 0;

    // Equity curve from starting balance + cumulative daily PnL
    let equity = startingBalance;
    let peak = startingBalance;
    let maxDD = 0;
    let peakIdx = 0;
    let troughIdx = 0;
    let curPeak = startingBalance;
    let curPeakIdx = 0;
    let recoveryDays: number | null = null;
    sortedDays.forEach((d, i) => {
      equity += Number(d.daily_pnl) || 0;
      if (equity > curPeak) { curPeak = equity; curPeakIdx = i; }
      const dd = curPeak > 0 ? ((curPeak - equity) / curPeak) * 100 : 0;
      if (dd > maxDD) { maxDD = dd; peak = curPeak; peakIdx = curPeakIdx; troughIdx = i; }
    });
    // Recovery: days from trough until equity reclaimed peak (after trough)
    if (maxDD > 0 && sortedDays.length) {
      let eq = startingBalance;
      for (let i = 0; i <= troughIdx; i++) eq += Number(sortedDays[i].daily_pnl) || 0;
      let recIdx: number | null = null;
      for (let i = troughIdx + 1; i < sortedDays.length; i++) {
        eq += Number(sortedDays[i].daily_pnl) || 0;
        if (eq >= peak) { recIdx = i; break; }
      }
      if (recIdx !== null) {
        const a = new Date(sortedDays[troughIdx].trade_date).getTime();
        const b = new Date(sortedDays[recIdx].trade_date).getTime();
        recoveryDays = Math.max(0, Math.round((b - a) / 86400000));
      }
    }

    // Volatility: stdev of daily % returns
    const dailyPcts = sortedDays.map(s => Number(s.daily_pnl_percent) || 0);
    const mean = dailyPcts.length ? dailyPcts.reduce((s, v) => s + v, 0) / dailyPcts.length : 0;
    const variance = dailyPcts.length
      ? dailyPcts.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyPcts.length
      : 0;
    const volatilityPct = Math.sqrt(variance);

    // R-multiple distribution (R = trade pnl / avg loss size)
    const rUnit = avgLoss > 0 ? avgLoss : 0;
    const rValues = rUnit > 0 ? pnls.map(p => p / rUnit) : [];
    const buckets = [
      { label: "<-2R", min: -Infinity, max: -2, tone: "bad" as const, count: 0 },
      { label: "-2..-1R", min: -2, max: -1, tone: "bad" as const, count: 0 },
      { label: "-1..0R", min: -1, max: 0, tone: "warn" as const, count: 0 },
      { label: "0..1R", min: 0, max: 1, tone: "default" as const, count: 0 },
      { label: "1..2R", min: 1, max: 2, tone: "good" as const, count: 0 },
      { label: ">2R", min: 2, max: Infinity, tone: "good" as const, count: 0 },
    ];
    for (const r of rValues) {
      const b = buckets.find(b => r >= b.min && r < b.max) || buckets[buckets.length - 1];
      b.count++;
    }
    const avgR = rValues.length ? rValues.reduce((s, v) => s + v, 0) / rValues.length : 0;
    const expectancy = pnls.length ? pnls.reduce((s, v) => s + v, 0) / pnls.length : 0;

    const totalLots = trades.reduce((s, t) => s + (Number(t.lot_size) || 0), 0);
    const daysRemaining = maxTradingDays > 0 ? Math.max(0, maxTradingDays - tradingDays) : null;
    const ageStart = createdAt ? new Date(createdAt).getTime() : Date.now();
    const accountAgeDays = Math.max(0, Math.floor((Date.now() - ageStart) / 86400000));

    return {
      winRate: pnls.length ? (wins.length / pnls.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
      avgWin, avgLoss,
      riskReward: avgLoss > 0 ? avgWin / avgLoss : 0,
      bestDay, worstDay, consistency,
      maxLossStreak: maxL, maxWinStreak: maxW,
      totalLots, totalTrades: trades.length,
      daysRemaining, accountAgeDays,
      maxDrawdownPct: maxDD,
      volatilityPct,
      recoveryDays,
      rMultBuckets: buckets.map(b => ({ label: b.label, count: b.count, tone: b.tone })),
      avgR, expectancy,
    };
  };

  const load = async () => {
    setLoading(true);
    const [tRes, dRes] = await Promise.all([
      supabase.from("prop_trades")
        .select("profit_loss,commission,swap,lot_size,closed_at,opened_at")
        .eq("prop_account_id", accountId)
        .eq("status", "closed"),
      supabase.from("prop_daily_stats")
        .select("trade_date,daily_pnl,daily_pnl_percent,account_balance")
        .eq("prop_account_id", accountId),
    ]);
    setM(compute((tRes.data || []) as any, (dRes.data || []) as any));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const ch = supabase.channel(`metrics-${accountId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${accountId}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_daily_stats", filter: `prop_account_id=eq.${accountId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId]);

  const saveThreshold = async () => {
    const v = parseFloat(thresholdDraft);
    if (Number.isNaN(v) || v < 5 || v > 100) {
      toast.error("Threshold must be 5–100%");
      return;
    }
    setSavingThreshold(true);
    const { error } = await supabase
      .from("user_prop_accounts")
      .update({ consistency_threshold_percent: v } as any)
      .eq("id", accountId);
    setSavingThreshold(false);
    if (error) { toast.error(error.message); return; }
    onThresholdChange?.(v);
    setEditingThreshold(false);
    toast.success(`Consistency threshold set to ${v}%`);
  };

  const consistencyTone = m
    ? (m.consistency >= consistencyThreshold ? "bad"
       : m.consistency >= consistencyThreshold * 0.75 ? "warn" : "good")
    : "default";
  const pfTone = m ? (m.profitFactor >= 1.5 ? "good" : m.profitFactor >= 1 ? "warn" : "bad") : "default";
  const wrTone = m ? (m.winRate >= 55 ? "good" : m.winRate >= 40 ? "warn" : "bad") : "default";
  const ddTone = m ? (m.maxDrawdownPct >= 8 ? "bad" : m.maxDrawdownPct >= 4 ? "warn" : "good") : "default";
  const volTone = m ? (m.volatilityPct >= 5 ? "bad" : m.volatilityPct >= 2 ? "warn" : "good") : "default";

  const maxBucket = m ? Math.max(1, ...m.rMultBuckets.map(b => b.count)) : 1;

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
        <div className="mt-2 animate-fade-in space-y-2">
          {loading && !m ? (
            <p className="text-[10px] text-muted-foreground py-3 text-center">Loading metrics…</p>
          ) : m && m.totalTrades === 0 ? (
            <p className="text-[10px] text-muted-foreground py-3 text-center">No closed trades yet — metrics will appear after your first trade.</p>
          ) : m ? (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                <Stat icon={Trophy}        label="Win rate"     value={`${m.winRate.toFixed(1)}%`} tone={wrTone} hint={`${Math.round(m.winRate * m.totalTrades / 100)}/${m.totalTrades}`} />
                <Stat icon={Scale}         label="Profit factor" value={m.profitFactor >= 99 ? "∞" : m.profitFactor.toFixed(2)} tone={pfTone} hint="gross W / L" />
                <Stat icon={Sparkles}      label="R:R avg"      value={m.riskReward > 0 ? `1:${m.riskReward.toFixed(2)}` : "—"} hint="avg win / loss" />
                <Stat icon={TrendingUp}    label="Avg win"      value={fmtMoney(m.avgWin)} tone="good" />
                <Stat icon={TrendingDown}  label="Avg loss"     value={fmtMoney(-m.avgLoss)} tone="bad" />
                <Stat icon={Activity}      label="Expectancy"   value={fmtMoney(m.expectancy)} tone={m.expectancy >= 0 ? "good" : "bad"} hint="avg $ / trade" />
                <Stat icon={TrendingDown}  label="Max DD"       value={`${m.maxDrawdownPct.toFixed(2)}%`} tone={ddTone} hint="peak → trough" />
                <Stat icon={Waves}         label="Volatility"   value={`${m.volatilityPct.toFixed(2)}%`} tone={volTone} hint="σ daily %" />
                <Stat icon={Timer}         label="Recovery"     value={m.recoveryDays === null ? "—" : `${m.recoveryDays}d`} tone={m.recoveryDays !== null && m.recoveryDays <= 5 ? "good" : "default"} hint="trough → peak" />
                <Stat icon={Sigma}         label="Avg R"        value={m.avgR ? `${m.avgR >= 0 ? "+" : ""}${m.avgR.toFixed(2)}R` : "—"} tone={m.avgR >= 0.2 ? "good" : m.avgR <= -0.2 ? "bad" : "warn"} />
                <Stat icon={Gauge}         label="Consistency"  value={`${m.consistency.toFixed(0)}%`} tone={consistencyTone as any} hint={`limit ${consistencyThreshold}%`} />
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

              {/* R-multiple distribution */}
              <div className="p-2 rounded-md bg-muted/20 border border-border/40">
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1"><Sigma className="w-3 h-3" /> R-multiple distribution</span>
                  <span>{m.rMultBuckets.reduce((s, b) => s + b.count, 0)} trades</span>
                </div>
                <div className="flex items-end gap-1 h-14">
                  {m.rMultBuckets.map(b => {
                    const h = (b.count / maxBucket) * 100;
                    const bar =
                      b.tone === "good" ? "bg-emerald-500" :
                      b.tone === "bad"  ? "bg-destructive" :
                      b.tone === "warn" ? "bg-orange-500"  : "bg-muted-foreground/50";
                    return (
                      <div key={b.label} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                        <div className="w-full flex items-end h-10">
                          <div className={cn("w-full rounded-t transition-all duration-500", bar)} style={{ height: `${h}%`, minHeight: b.count > 0 ? 2 : 0 }} />
                        </div>
                        <span className="text-[8px] font-mono text-muted-foreground truncate w-full text-center">{b.label}</span>
                        <span className="text-[8px] font-bold">{b.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editable consistency threshold */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/20 border border-border/40">
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground">Consistency threshold</p>
                  <p className="text-[10px] text-foreground">
                    Warn when one day exceeds <span className="font-bold">{consistencyThreshold}%</span> of total profit.
                  </p>
                </div>
                {editingThreshold ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={5}
                      max={100}
                      step={1}
                      value={thresholdDraft}
                      onChange={e => setThresholdDraft(e.target.value)}
                      className="w-14 h-6 px-1 text-[10px] rounded border border-border bg-background text-right font-mono"
                    />
                    <button onClick={saveThreshold} disabled={savingThreshold} className="h-6 w-6 rounded bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center disabled:opacity-50">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setEditingThreshold(false); setThresholdDraft(String(consistencyThreshold)); }} className="h-6 w-6 rounded bg-muted hover:bg-muted/70 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingThreshold(true)} className="h-6 px-2 rounded text-[10px] bg-muted hover:bg-muted/70 flex items-center gap-1 shrink-0">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
            </>
          ) : null}

          {m && m.consistency >= consistencyThreshold && (
            <div className="p-1.5 rounded-md bg-destructive/10 border border-destructive/30 text-[9px] text-destructive">
              Consistency rule warning — one day represents over {consistencyThreshold}% of total profit. Most prop firms reject payouts above this threshold.
            </div>
          )}
          {passedAt && (
            <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-500">
              Phase passed on {new Date(passedAt).toLocaleDateString()} — eligible for payout.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
