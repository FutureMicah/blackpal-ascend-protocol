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
        return 'Pay in Naira to activate your BTA Dashboard';
      case 'AFRICA':
        return 'Crypto Pass Required — Join the Continental Elite';
      case 'INTERNATIONAL':
        return 'International Access — Premium Global Citizenship';
    }
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
        <div className="relative p-8 md:p-12 rounded-3xl border border-primary/30 bg-card/90 backdrop-blur-xl">
          {/* Tier Icon */}
          <motion.div
            className="flex justify-center mb-6"
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
            <div className="p-6 rounded-2xl bg-primary/10 text-primary">
              {getTierIcon()}
            </div>
          </motion.div>

          {/* Tier Name */}
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            {geoData.paymentTier}
            <span className="block text-xl md:text-2xl text-primary font-light mt-2">
              Tier Access
            </span>
          </h2>

          {/* Description */}
          <p className="text-center text-lg text-muted-foreground mb-8">
            {getTierDescription()}
          </p>

          {/* Price Display */}
          <div className="p-6 rounded-2xl border border-border bg-background/50 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activation Fee</p>
                <p className="text-3xl font-bold">
                  ${geoData.amountUSD}
                  {geoData.localCurrency && (
                    <span className="text-lg text-muted-foreground ml-2">
                      ({geoData.localCurrency})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">XP Reward</p>
                <p className="text-3xl font-bold text-primary">
                  +{xpReward} XP
                </p>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Full Access to BlackBoard Trading Academy</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Real-time Market Analysis Tools</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Citizenship in BTA Digital Republic</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Global Leaderboard Participation</span>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Continue to Payment
          </Button>

          {/* Security Notice */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            🔒 Secure payment processing • All transactions encrypted
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
