import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingDown, Calendar, Activity, ShieldAlert, CheckCircle2, Link2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { MT5ConnectDialog } from "./MT5ConnectDialog";
import { formatDistanceToNow } from "date-fns";

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
        <span className={cn("font-mono font-semibold", danger ? "text-destructive" : "text-foreground")}>{hint}</span>
      </div>
      <div className="h-1.5 mt-1 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AccountHealthCard({ account }: { account: Account }) {
  const t = account.prop_tiers;
  const [todayLoss, setTodayLoss] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);

  const syncStatus = account.mt5_sync_status ?? "disconnected";
  const syncOn = !!account.mt5_sync_enabled && syncStatus === "connected";
  const lastSync = account.mt5_last_sync_at
    ? formatDistanceToNow(new Date(account.mt5_last_sync_at), { addSuffix: true })
    : null;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("prop_daily_stats")
        .select("daily_pnl_percent")
        .eq("prop_account_id", account.id)
        .eq("trade_date", today)
        .maybeSingle();
      if (mounted) setTodayLoss(Math.max(0, -(data?.daily_pnl_percent ?? 0)));
    };
    load();

    const ch = supabase.channel(`acct-${account.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_trades", filter: `prop_account_id=eq.${account.id}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prop_daily_stats", filter: `prop_account_id=eq.${account.id}` },
        () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [account.id]);

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
    <Card className="border-border overflow-hidden">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <span>{t.badge_icon || "🏆"}</span>{t.tier_name}
              <Badge variant="outline" className="text-[9px] capitalize">{account.phase}</Badge>
            </p>
            <p className="text-[10px] text-muted-foreground">Start ₦{Number(starting).toLocaleString()} → Now ₦{Number(account.current_equity).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className={cn("text-sm font-bold font-mono", pnlPct >= 0 ? "text-emerald-500" : "text-destructive")}>
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
          <div className={cn("flex items-center gap-1.5 text-[10px] p-2 rounded-md",
            passed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive")}>
            {passed ? <CheckCircle2 className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
            {passed ? "Phase passed — payout unlocked" : "Account breached rules — contact admin"}
          </div>
        )}

        {/* MT5 live-sync footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
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
