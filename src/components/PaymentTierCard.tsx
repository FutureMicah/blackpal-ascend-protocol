import { motion } from "framer-motion";
import { GeoData, getXPReward } from "@/lib/geo";
import { Zap, Shield, Crown } from "lucide-react";
import { Button } from "./ui/button";

interface PaymentTierCardProps {
  geoData: GeoData;
  onContinue: () => void;
}

export const PaymentTierCard = ({ geoData, onContinue }: PaymentTierCardProps) => {
  const xpReward = getXPReward(geoData.paymentTier);

  const getTierIcon = () => {
    switch (geoData.paymentTier) {
      case 'NIGERIA':
        return <Zap className="w-12 h-12" />;
      case 'AFRICA':
        return <Shield className="w-12 h-12" />;
      case 'INTERNATIONAL':
        return <Crown className="w-12 h-12" />;
    }
  };

  const getTierDescription = () => {
    switch (geoData.paymentTier) {
      case 'NIGERIA':
        return 'Pay ₦1,000 in Naira to activate your BTA Dashboard';
      case 'AFRICA':
        return 'Crypto Pass Required — $100 USDT to Join the Continental Elite';
      case 'INTERNATIONAL':
        return 'International Access — $200 USDT Premium Global Citizenship';
    }
  };

  const getPriceDisplay = () => {
    if (geoData.paymentTier === 'NIGERIA') {
      return '₦1,000';
    }
    return `$${geoData.amountUSD}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4"
    >
      <motion.div
        className="relative max-w-2xl w-full"
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring" }}
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-3xl opacity-50" />

        {/* Main Card */}
        <div className="relative p-6 md:p-8 rounded-3xl border border-primary/30 bg-card/90 backdrop-blur-xl">
          {/* Tier Icon */}
          <motion.div
            className="flex justify-center mb-4"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              {getTierIcon()}
            </div>
          </motion.div>

          {/* Tier Name */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
            {geoData.paymentTier}
            <span className="block text-lg md:text-xl text-primary font-light mt-1">
              Tier Access
            </span>
          </h2>

          {/* Description */}
          <p className="text-center text-base text-muted-foreground mb-4">
            {getTierDescription()}
          </p>

          {/* Price Display */}
          <div className="p-4 rounded-2xl border border-border bg-background/50 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Activation Fee</p>
                <p className="text-2xl font-bold">
                  {getPriceDisplay()}
                  {geoData.paymentTier !== 'NIGERIA' && geoData.localCurrency && (
                    <span className="text-sm text-muted-foreground ml-2">
                      USDT
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">XP Reward</p>
                <p className="text-2xl font-bold text-primary">
                  +{xpReward} XP
                </p>
              </div>
            </div>
          </div>

          {/* Compulsory Notice */}
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
            <p className="text-sm text-center text-destructive font-medium">
              ⚠️ Payment is required to access the platform
            </p>
          </div>

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            Continue to Payment
          </Button>

          {/* Security Notice */}
          <p className="text-xs text-center text-muted-foreground mt-3">
            🔒 One-time activation • Pay once, access forever
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
