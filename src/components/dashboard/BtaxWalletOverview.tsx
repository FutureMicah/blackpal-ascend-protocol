import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, ArrowDownLeft, ArrowUpRight, Gift, HandCoins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface BtaxWalletOverviewProps {
  userId: string;
}

interface WalletRow {
  id: string;
  btax_balance: number;
  naira_balance: number;
  naira_funded_total: number;
  btax_spent_total: number;
  btax_earned_total: number;
  status: string;
}

interface TxRow {
  id: string;
  type: "fund" | "spend" | "reward" | "grant" | "refund" | "adjustment";
  btax_amount: number;
  naira_amount: number;
  description: string | null;
  created_at: string;
}

const TYPE_META: Record<TxRow["type"], { label: string; icon: any; tone: string }> = {
  fund: { label: "Funded", icon: ArrowDownLeft, tone: "text-emerald-400" },
  spend: { label: "Spent", icon: ArrowUpRight, tone: "text-rose-400" },
  reward: { label: "Reward", icon: Gift, tone: "text-amber-400" },
  grant: { label: "Sponsor", icon: HandCoins, tone: "text-sky-400" },
  refund: { label: "Refund", icon: ArrowDownLeft, tone: "text-emerald-400" },
  adjustment: { label: "Adjustment", icon: Coins, tone: "text-muted-foreground" },
};

export const BtaxWalletOverview = ({ userId }: BtaxWalletOverviewProps) => {
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [breakdown, setBreakdown] = useState({ rewardBtax: 0, sponsorBtax: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data: w } = await supabase
        .from("wallets")
        .select("id, btax_balance, naira_balance, naira_funded_total, btax_spent_total, btax_earned_total, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (!alive) return;
      if (!w) {
        setLoading(false);
        return;
      }
      setWallet(w as WalletRow);

      const { data: t } = await supabase
        .from("wallet_transactions")
        .select("id, type, btax_amount, naira_amount, description, created_at")
        .eq("wallet_id", w.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!alive) return;
      const list = (t ?? []) as TxRow[];
      setTxs(list);

      // Reward / sponsor totals from the user's own ledger
      const { data: agg } = await supabase
        .from("wallet_transactions")
        .select("type, btax_amount")
        .eq("wallet_id", w.id);

      if (!alive) return;
      let rewardBtax = 0;
      let sponsorBtax = 0;
      (agg ?? []).forEach((row: any) => {
        if (row.type === "reward") rewardBtax += Number(row.btax_amount);
        if (row.type === "grant") sponsorBtax += Number(row.btax_amount);
      });
      setBreakdown({ rewardBtax, sponsorBtax });
      setLoading(false);
    };

    load();

    const ch = supabase
      .channel(`btax-wallet-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` },
        load
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="frost-card p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="frost-card p-6 text-center text-xs text-ink-soft">
        Your academy wallet will appear here once an admin sets it up.
      </div>
    );
  }

  const nairaToBtax = Number(wallet.naira_balance || 0) / 100; // 1 BTAX = ₦100

  return (
    <motion.div
      className="frost-card p-6 space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-ink-soft">
          My Academy Wallet
        </h2>
        <div className="flex items-center gap-2">
          <a
            href="/wallet/topup"
            className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition focus-visible:ring-2 focus-visible:ring-primary"
          >
            Request top-up
          </a>
          <span className="text-[10px] uppercase tracking-wider text-ink-soft">
            {wallet.status}
          </span>
        </div>
      </div>

      {/* Naira balance — admin controlled, used to convert into BTAX */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            Naira balance
          </div>
          <span className="text-[9px] uppercase tracking-wider text-ink-soft">
            Set by admin
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-[32px] leading-none font-semibold tracking-tight text-ink">
            ₦{Number(wallet.naira_balance || 0).toLocaleString()}
          </div>
        </div>
        <div className="text-[11px] text-ink-soft mt-2 flex items-center justify-between">
          <span>Convertible to {nairaToBtax.toLocaleString()} BTAX (₦100 = 1 BTAX)</span>
          <a
            href="/blackcoin?action=convert"
            className="text-primary font-semibold hover:underline"
          >
            Convert →
          </a>
        </div>
      </div>

      {/* BTAX balance */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          BTAX balance
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-[44px] leading-none font-semibold tracking-tight text-ink">
            {Number(wallet.btax_balance).toLocaleString()}
          </div>
          <div className="text-base font-medium text-ink-soft">BTAX</div>
        </div>
        <div className="text-[11px] text-ink-soft mt-2">
          Earned {Number(wallet.btax_earned_total).toLocaleString()} · Spent{" "}
          {Number(wallet.btax_spent_total).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-amber-50 border border-amber-200/70 p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 uppercase tracking-[0.18em] font-semibold">
            <Gift className="w-3 h-3" /> Rewards
          </div>
          <div className="text-xl font-semibold mt-1 text-ink">
            {breakdown.rewardBtax.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-sky-50 border border-sky-200/70 p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-sky-700 uppercase tracking-[0.18em] font-semibold">
            <HandCoins className="w-3 h-3" /> Sponsored
          </div>
          <div className="text-xl font-semibold mt-1 text-ink">
            {breakdown.sponsorBtax.toLocaleString()}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-soft mb-2">
          Recent activity
        </div>
        {txs.length === 0 ? (
          <div className="text-[11px] text-ink-soft py-3 text-center">
            No transactions yet.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {txs.map((tx) => {
              const meta = TYPE_META[tx.type];
              const Icon = meta.icon;
              const sign = ["spend"].includes(tx.type) ? "−" : "+";
              const isOut = tx.type === "spend";
              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-2.5 text-[12px] py-2 px-2 rounded-xl hover:bg-black/[0.04]"
                >
                  <span className="w-7 h-7 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center">
                    <Icon className={`w-3.5 h-3.5 ${isOut ? "text-rose-500" : "text-emerald-500"}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-ink font-medium">
                      {tx.description ?? meta.label}
                    </div>
                    <div className="text-[10px] text-ink-soft">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`font-mono font-semibold ${isOut ? "text-rose-500" : "text-emerald-600"}`}>
                    {sign}
                    {Number(tx.btax_amount).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
};
