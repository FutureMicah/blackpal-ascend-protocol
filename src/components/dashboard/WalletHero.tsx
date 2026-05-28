// Crypto-wallet style hero for the Dashboard.
// Visual: deep purple radial dome, big balance, circular action stack,
// and a floating coin cluster on the right. Pulls real BTAX + NGN data.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Plus, LayoutGrid, Bell, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

const ActionBtn = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group"
  >
    <span className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full grid place-items-center
      bg-gradient-to-br from-white/15 to-white/[0.03] backdrop-blur-xl
      border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_24px_rgba(80,40,180,0.35)]
      group-active:scale-95 transition">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
    </span>
    <span className="text-[9px] sm:text-[10px] text-white/70 font-medium">{label}</span>
  </button>
);

export const WalletHero = ({ userId, displayName, avatarUrl }: Props) => {
  const navigate = useNavigate();
  const [btax, setBtax] = useState(0);
  const [naira, setNaira] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("wallets")
        .select("btax_balance, naira_balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (!alive || !data) return;
      setBtax(Number(data.btax_balance) || 0);
      setNaira(Number(data.naira_balance) || 0);
    })();
    const ch = supabase
      .channel(`wallet-hero-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` }, (p: any) => {
        const w = p.new;
        if (w) { setBtax(Number(w.btax_balance) || 0); setNaira(Number(w.naira_balance) || 0); }
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [userId]);

  const firstName = (displayName || "Trader").split(" ")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[28px] mb-4
        bg-[radial-gradient(140%_90%_at_50%_-10%,hsl(258_90%_55%/0.95)_0%,hsl(258_70%_30%/0.85)_35%,hsl(248_60%_12%)_70%,hsl(240_40%_6%)_100%)]
        border border-white/10 shadow-[0_30px_80px_-20px_rgba(99,52,228,0.55)]"
    >
      {/* moon-arc highlight */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[160%] h-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />

      <div className="relative p-4 sm:p-6">
        {/* Top row: avatar + name + bell */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden ring-2 ring-white/40 bg-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-white font-bold text-sm">
                  {firstName.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="leading-tight">
              <p className="text-[13px] sm:text-sm font-semibold text-white">{firstName}</p>
              <p className="text-[9px] sm:text-[10px] text-white/60 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI assist
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 grid place-items-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Balance */}
        <div className="mt-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">Total Balance</p>
          <div className="flex items-end justify-center gap-1 mt-1">
            <span className="text-white/80 text-lg font-semibold">₿</span>
            <span className="text-4xl sm:text-5xl font-bold text-white tabular-nums">
              {btax.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-white/70 text-sm font-medium mb-1">BTAX</span>
          </div>
          <p className="text-[10px] text-white/55 mt-1">
            ≈ ₦{naira.toLocaleString(undefined, { maximumFractionDigits: 0 })} NGN · invested
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3 place-items-center">
          <ActionBtn icon={ArrowDownToLine} label="Withdraw" onClick={() => navigate("/payment")} />
          <ActionBtn icon={ArrowUpFromLine} label="Send" onClick={() => navigate("/payment")} />
          <ActionBtn icon={Plus} label="Add Funds" onClick={() => navigate("/naira-topup")} />
          <ActionBtn icon={LayoutGrid} label="More" onClick={() => navigate("/black-coin")} />
        </div>
      </div>
    </motion.div>
  );
};
