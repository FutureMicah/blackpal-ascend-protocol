import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Coins, ShoppingBag, Flame, Gauge, Loader2 } from "lucide-react";
import { formatBtax } from "@/lib/btax";

interface Stats {
  balance: number;
  spent_total: number;
  marketplace_spend: number;
  transfer_out_total: number;
  fees_paid: number;
  fee_pct: number;
  daily_cap: number;
  min_transfer: number;
  used_today: number;
}

export function BtaxTokenomicsPanel({ userId }: { userId: string }) {
  const [s, setS] = useState<Stats | null>(null);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [walletRes, settingsRes, txRes] = await Promise.all([
      supabase.from("wallets").select("id,btax_balance,btax_spent_total").eq("user_id", userId).maybeSingle(),
      supabase.from("academy_settings").select("btax_transfer_fee_percent,btax_daily_transfer_cap,p2p_min_transfer").limit(1).maybeSingle(),
      supabase.from("wallets").select("id").eq("user_id", userId).maybeSingle(),
    ]);
    const walletId = (txRes.data as any)?.id;
    let marketplace = 0, transferOut = 0, usedToday = 0;
    if (walletId) {
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("type,btax_amount,description,created_at")
        .eq("wallet_id", walletId);
      for (const t of (txs || []) as any[]) {
        if (t.type === "spend" && String(t.description || "").startsWith("Marketplace:")) {
          marketplace += Number(t.btax_amount || 0);
        }
        if (t.type === "transfer_out") {
          transferOut += Number(t.btax_amount || 0);
          if (String(t.created_at).slice(0, 10) === today) usedToday += Number(t.btax_amount || 0);
        }
      }
    }
    const feePct = Number((settingsRes.data as any)?.btax_transfer_fee_percent ?? 0);
    setS({
      balance: Number((walletRes.data as any)?.btax_balance ?? 0),
      spent_total: Number((walletRes.data as any)?.btax_spent_total ?? 0),
      marketplace_spend: marketplace,
      transfer_out_total: transferOut,
      fees_paid: Math.round(transferOut * feePct) / 100,
      fee_pct: feePct,
      daily_cap: Number((settingsRes.data as any)?.btax_daily_transfer_cap ?? 0),
      min_transfer: Number((settingsRes.data as any)?.p2p_min_transfer ?? 0),
      used_today: usedToday,
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  if (!s) {
    return <Card className="p-3"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading tokenomics…</div></Card>;
  }

  const capPct = s.daily_cap > 0 ? Math.min(100, (s.used_today / s.daily_cap) * 100) : 0;

  return (
    <Card className="p-3 space-y-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold flex items-center gap-1.5">
          <Coins className="w-3 h-3 text-primary" /> BTAX Tokenomics
        </p>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Live</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric icon={<Coins className="w-3 h-3 text-primary" />} label="Balance" value={formatBtax(s.balance)} />
        <Metric icon={<ShoppingBag className="w-3 h-3 text-emerald-400" />} label="Marketplace spend" value={formatBtax(s.marketplace_spend)} />
        <Metric icon={<Flame className="w-3 h-3 text-amber-400" />} label="Transfer fees paid" value={formatBtax(s.fees_paid)} sub={`@ ${s.fee_pct}%`} />
        <Metric icon={<Gauge className="w-3 h-3 text-sky-400" />} label="Sent today" value={formatBtax(s.used_today)} sub={`cap ${s.daily_cap.toLocaleString()}`} />
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-400 to-primary transition-all duration-700" style={{ width: `${capPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1 font-mono">
          <span>Min transfer {s.min_transfer} BTAX · Fee {s.fee_pct}%</span>
          <span>{capPct.toFixed(0)}% of daily cap</span>
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="p-2 rounded-lg bg-card/60 border border-border">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <p className="text-sm font-bold font-mono mt-0.5">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground font-mono">{sub}</p>}
    </div>
  );
}
