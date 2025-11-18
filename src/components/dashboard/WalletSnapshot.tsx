import { motion } from "framer-motion";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletSnapshotProps {
  userId: string;
}

export const WalletSnapshot = ({ userId }: WalletSnapshotProps) => {
  return (
    <motion.div
      className="glass-card p-6 space-y-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Wallet
        </h2>
      </div>

      {/* Coin Visual */}
      <div className="relative h-20 flex items-center justify-center">
        <motion.div
          className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/30 to-amber-500/30 blur-xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg"
          animate={{
            rotateY: 360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span className="text-xl font-bold text-white">₦</span>
        </motion.div>
      </div>

      {/* Balance */}
      <div className="text-center space-y-1">
        <div className="text-3xl font-bold text-foreground">₦0.00</div>
        <div className="text-sm text-muted-foreground">~$0.00 USD</div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1">
          <ArrowDownToLine className="w-4 h-4" />
          <span className="text-xs">Deposit</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1">
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs">Convert</span>
        </Button>
        <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1">
          <ArrowUpFromLine className="w-4 h-4" />
          <span className="text-xs">Withdraw</span>
        </Button>
      </div>

      {/* Notice */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
        Complete KYC to enable withdrawals
      </div>
    </motion.div>
  );
};
