import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WalletSnapshotProps {
  userId: string;
}

export const WalletSnapshot = ({ userId }: WalletSnapshotProps) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const loadBalance = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("virtual_currency")
        .eq("id", userId)
        .single();
      
      if (data) {
        setBalance(data.virtual_currency || 0);
      }
    };
    loadBalance();
  }, [userId]);

  

  return (
    <motion.div
      className="nft-hero p-5 space-y-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/80 text-[10px] uppercase tracking-[0.2em]">
          <Wallet className="w-3.5 h-3.5" />
          My balance
        </div>
        <span className="text-[10px] text-white/70 font-mono">Virtual currency</span>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-semibold tracking-tight text-white">
            {balance.toLocaleString()}
          </div>
          <span className="text-base font-medium text-white/80">BTAX</span>
        </div>
        <p className="text-[10px] text-white/60 mt-1">Yearly rewards · live</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-col h-auto py-2.5 gap-1 bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
          onClick={() => navigate("/wallet/topup")}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span className="text-[10px]">Deposit ₦</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-col h-auto py-2.5 gap-1 bg-white text-[hsl(248_84%_30%)] hover:bg-white/90 border-0"
          onClick={() => navigate("/blackcoin?action=convert")}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Convert</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-col h-auto py-2.5 gap-1 bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur"
          onClick={() => navigate("/blackcoin?action=withdraw")}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span className="text-[10px]">Send</span>
        </Button>
      </div>

      <div className="text-[10px] text-white/60 text-center pt-2 border-t border-white/10">
        Complete KYC to enable withdrawals
      </div>
    </motion.div>
  );
};
