import { motion } from "framer-motion";
import { Clock, ArrowLeft } from "lucide-react";

interface PaymentPendingScreenProps {
  onBack: () => void;
}

// Shown after a payment is recorded as PENDING. Nothing is unlocked here:
// access opens only when Index polls Supabase and sees payment_completed = true.
export const PaymentPendingScreen = ({ onBack }: PaymentPendingScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full text-center rounded-2xl border border-primary/40 bg-card/60 p-8 shadow-lg">
        <Clock className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment pending</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your payment has been submitted and is waiting for confirmation. This screen
          updates automatically. Access unlocks only after the payment is verified. Keep this page open or come back later.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to payment options
        </button>
      </div>
    </motion.div>
  );
};
