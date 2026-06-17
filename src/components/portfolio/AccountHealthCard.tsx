import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingDown, Calendar, Activity, ShieldAlert, CheckCircle2, Link2, Radio, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MT5ConnectDialog } from "./MT5ConnectDialog";
import { RecentTradesList } from "./RecentTradesList";
import { PropFirmMetrics } from "./PropFirmMetrics";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Tier {
  tier_name: string; badge_icon: string | null;
  account_size: number;
  profit_target_percent: number;
  max_total_drawdown_percent: number;
  max_daily_loss_percent: number;
  min_trading_days: number;
  max_trading_days: number;
  payout_target_balance: number;
  student_payout: number;
  profit_split_percent: number;
}
interface Account {
  id: string;
  starting_balance: number;
  account_balance: number;
  current_equity: number;
  highest_balance: number;
  total_pnl: number;
  total_trades: number;
  trading_days: number;
  status: string;
  phase: string;
  profit_target_hit: boolean;
  max_drawdown_hit: boolean;
  max_daily_loss_hit: boolean;
  tier_id: string;
  prop_tiers?: Tier | null;
  mt5_sync_enabled?: boolean | null;
  mt5_sync_status?: string | null;
  mt5_last_sync_at?: string | null;
  mt5_last_error?: string | null;
  mt5_broker?: string | null;
  mt5_open_positions?: number | null;
  passed_at?: string | null;
  created_at?: string | null;
}

const colorFor = (used: number, danger = 80, warn = 60) =>
  used >= danger ? "bg-destructive" : used >= warn ? "bg-orange-500" : "bg-emerald-500";

function HealthRow({ icon: Icon, label, used, hint, danger = false }: {
  icon: any; label: string; used: number; hint: string; danger?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, used));
  const bar = danger ? "bg-destructive" : colorFor(pct);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-muted-foreground"><Icon className="w-3 h-3" /> {label}</span>
        <span className={cn("font-mono font-semibold tabular-nums", danger ? "text-destructive" : "text-foreground")}>{hint}</span>
      </div>
      <div className="h-1.5 mt-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-out", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AccountHealthCard({ account: initial }: { account: Account }) {
  const [account, setAccount] = useState<Account>(initial);
  const t = account.prop_tiers;
  const [todayLoss, setTodayLoss] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [flash, setFlash] = useState(false);
  const tradeCountRef = useRef(account.total_trades ?? 0);

  // keep local account in sync if parent provides a new prop
  useEffect(() => { setAccount(initial); tradeCountRef.current = initial.total_trades ?? 0; }, [initial.id]);

  const syncStatus = account.mt5_sync_status ?? "disconnected";
  const syncOn = !!account.mt5_sync_enabled && syncStatus === "connected";
  const lastSync = account.mt5_last_sync_at
    ? formatDistanceToNow(new Date(account.mt5_last_sync_at), { addSuffix: true })
    : null;

  useEffect(() => {
    let mounted = true;
    const loadDaily = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("prop_daily_stats")
        .select("daily_pnl_percent")
        .eq("prop_account_id", account.id)
        .eq("trade_date", today)
        .maybeSingle();
      if (mounted) setTodayLoss(Math.max(0, -(data?.daily_pnl_percent ?? 0)));
    };
    loadDaily();

    const ch = supabase.channel(`acct-${account.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${account.id}` },
        () => loadDaily())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_daily_stats", filter: `prop_account_id=eq.${account.id}` },
        () => loadDaily())
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_prop_accounts", filter: `id=eq.${account.id}` },
        (payload) => {
          const next = payload.new as Account;
          // Preserve tier (joined data not in realtime payload)
          setAccount((prev) => ({ ...prev, ...next, prop_tiers: prev.prop_tiers }));
          setFlash(true);
          setTimeout(() => setFlash(false), 700);
        })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [account.id]);

  const resync = async () => {
    if (resyncing) return;
    setResyncing(true);
    const before = tradeCountRef.current;
    try {
      const { data, error } = await supabase.functions.invoke("mt5-sync", { body: { tick: Date.now() } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      // re-fetch the account to capture latest counters
      const { data: fresh } = await supabase
        .from("user_prop_accounts")
        .select("*, prop_tiers(*)")
        .eq("id", account.id)
        .maybeSingle();
      if (fresh) {
        setAccount(fresh as any);
        const delta = (fresh.total_trades ?? 0) - before;
        tradeCountRef.current = fresh.total_trades ?? before;
        toast.success(
          delta > 0 ? `Synced — ${delta} new trade${delta === 1 ? "" : "s"}` : "Synced — no new trades",
          { description: `Last sync just now` },
        );
      } else {
        toast.success("Resync complete");
      }
    } catch (e: any) {
      const lastSyncTxt = account.mt5_last_sync_at
        ? `Last successful sync ${formatDistanceToNow(new Date(account.mt5_last_sync_at), { addSuffix: true })}`
        : "No successful sync yet";
      const reason = e?.message || account.mt5_last_error || "Unknown error";
      toast.error("Resync failed", { description: `${reason} · ${lastSyncTxt}` });
    } finally {
      setResyncing(false);
    }
  };

  if (!t) return null;

  const starting = account.starting_balance || t.account_size || 1;
  const pnlPct = ((account.current_equity - starting) / starting) * 100;
  const profitProgress = t.profit_target_percent > 0
    ? Math.max(0, Math.min(100, (pnlPct / t.profit_target_percent) * 100))
    : 0;

  const drawdown = ((account.highest_balance - account.current_equity) / starting) * 100;
  const ddUsedPct = t.max_total_drawdown_percent > 0
    ? Math.max(0, Math.min(100, (drawdown / t.max_total_drawdown_percent) * 100))
    : 0;

  const dailyUsedPct = t.max_daily_loss_percent > 0
    ? Math.max(0, Math.min(100, (todayLoss / t.max_daily_loss_percent) * 100))
    : 0;

  const daysProgress = t.min_trading_days > 0
    ? Math.min(100, (account.trading_days / t.min_trading_days) * 100)
    : 100;

  const passed = account.status === "passed" || account.profit_target_hit;
  const failed = account.status === "failed" || account.max_drawdown_hit || account.max_daily_loss_hit;

  return (
    <Card className={cn(
      "border-border overflow-hidden w-full max-w-full transition-shadow duration-500",
      flash && "ring-1 ring-primary/40 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.45)]",
    )}>
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
              <span>{t.badge_icon || "🏆"}</span>
              <span className="truncate">{t.tier_name}</span>
              <Badge variant="outline" className="text-[9px] capitalize">{account.phase}</Badge>
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Start ₦{Number(starting).toLocaleString()} → Now ₦{Number(account.current_equity).toLocaleString()}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={cn("text-sm font-bold font-mono tabular-nums transition-colors duration-500",
              pnlPct >= 0 ? "text-emerald-500" : "text-destructive")}>
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </p>
            <p className="text-[9px] text-muted-foreground">{account.total_trades} trades</p>
          </div>
        </div>

        <div className="space-y-2">
          <HealthRow icon={Target} label="Profit target" used={profitProgress}
            hint={`${pnlPct.toFixed(2)}% / ${t.profit_target_percent}%`} />
          <HealthRow icon={TrendingDown} label="Drawdown used" used={ddUsedPct}
            hint={`${drawdown.toFixed(2)}% / ${t.max_total_drawdown_percent}%`}
            danger={account.max_drawdown_hit} />
          <HealthRow icon={ShieldAlert} label="Daily loss used" used={dailyUsedPct}
            hint={`${todayLoss.toFixed(2)}% / ${t.max_daily_loss_percent}%`}
            danger={account.max_daily_loss_hit} />
          <HealthRow icon={Calendar} label="Trading days" used={daysProgress}
            hint={`${account.trading_days} / ${t.min_trading_days}`} />
        </div>

        {(passed || failed) && (
          <div className={cn("flex items-center gap-1.5 text-[10px] p-2 rounded-md animate-fade-in",
            passed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive")}>
            {passed ? <CheckCircle2 className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
            {passed ? "Phase passed — payout unlocked" : "Account breached rules — contact admin"}
          </div>
        )}

        {/* Recent trades */}
        <RecentTradesList accountId={account.id} />

        {/* Prop-firm performance metrics (collapsible) */}
        <PropFirmMetrics
          accountId={account.id}
          startingBalance={account.starting_balance || t.account_size}
          maxTradingDays={t.max_trading_days ?? 0}
          tradingDays={account.trading_days}
          passedAt={account.passed_at ?? null}
          createdAt={account.created_at ?? null}
        />

        {/* MT5 live-sync footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors duration-500",
              syncOn ? "bg-emerald-500 animate-pulse" :
              syncStatus === "connecting" ? "bg-orange-500 animate-pulse" :
              syncStatus === "error" ? "bg-destructive" : "bg-muted-foreground/40"
            )} />
            <span className="text-[10px] text-muted-foreground truncate">
              {syncOn
                ? <>MT5 live · {account.mt5_open_positions ?? 0} open{lastSync ? ` · ${lastSync}` : ""}</>
                : syncStatus === "connecting" ? "Connecting to MT5…"
                : syncStatus === "error" ? <span className="text-destructive">MT5 error</span>
                : "MT5 not linked"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {syncOn && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px]"
                onClick={resync}
                disabled={resyncing}
                aria-label="Resync now"
                title="Resync now"
              >
                <RefreshCw className={cn("w-3 h-3", resyncing && "animate-spin")} />
              </Button>
            )}
            <Button
              size="sm"
              variant={syncOn ? "ghost" : "outline"}
              className="h-6 px-2 text-[10px]"
              onClick={() => setConnectOpen(true)}
            >
              {syncOn ? <Radio className="w-3 h-3 mr-1" /> : <Link2 className="w-3 h-3 mr-1" />}
              {syncOn ? "Manage" : "Link MT5"}
            </Button>
          </div>
        </div>
        {account.mt5_last_error && syncStatus === "error" && (
          <p className="text-[9px] text-destructive/80 line-clamp-2">{account.mt5_last_error}</p>
        )}
      </CardContent>

      <MT5ConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        accountId={account.id}
        defaultBroker={account.mt5_broker ?? undefined}
      />
    </Card>
  );
}
