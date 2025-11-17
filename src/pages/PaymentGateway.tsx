import { motion } from "framer-motion";
import { GeoData, getPaymentMethods } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { CreditCard, Smartphone, QrCode, DollarSign } from "lucide-react";
import { useState } from "react";

interface PaymentGatewayProps {
  geoData: GeoData;
  onMethodSelect: (method: string) => void;
  onBack: () => void;
}

export const PaymentGateway = ({ geoData, onMethodSelect, onBack }: PaymentGatewayProps) => {
  const methods = getPaymentMethods(geoData.paymentTier);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'paystack':
      case 'flutterwave':
      case 'crypto_trc20':
      case 'crypto_bsc':
        return <CreditCard className="w-8 h-8" />;
      case 'bank_transfer':
        return <DollarSign className="w-8 h-8" />;
      case 'ussd':
        return <Smartphone className="w-8 h-8" />;
      case 'voucher':
        return <QrCode className="w-8 h-8" />;
      default:
        return <CreditCard className="w-8 h-8" />;
    }
  };

  const getMethodName = (method: string): string => {
    switch (method) {
      case 'paystack':
        return 'Paystack (NGN)';
      case 'flutterwave':
        return 'Flutterwave (NGN)';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'ussd':
        return 'USSD Payment';
      case 'voucher':
        return 'Voucher Code';
      case 'crypto_trc20':
        return 'USDT (TRC20)';
      case 'crypto_bsc':
        return 'USDT (BSC)';
      default:
        return method;
    }
  };

  const getMethodDescription = (method: string): string => {
    switch (method) {
      case 'paystack':
      case 'flutterwave':
        return 'Pay securely with your debit/credit card';
      case 'bank_transfer':
        return 'Direct bank transfer to our account';
      case 'ussd':
        return 'Dial USSD code to pay instantly';
      case 'voucher':
        return 'Redeem your BTA voucher code';
      case 'crypto_trc20':
        return 'Pay with USDT on Tron network';
      case 'crypto_bsc':
        return 'Pay with USDT on Binance Smart Chain';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 overflow-y-auto"
    >
      <div className="max-w-4xl w-full py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            BLACK PAY
            <span className="block text-xl md:text-2xl text-primary font-light mt-2">
              Global Access Gateway
            </span>
          </h1>
          <p className="text-muted-foreground">
            Select your preferred payment method
          </p>
        </motion.div>

        {/* Payment Amount */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl border border-primary/30 bg-card/50 backdrop-blur-sm mb-8 text-center"
        >
          <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
          <p className="text-4xl font-bold">
            ${geoData.amountUSD}
            {geoData.localCurrency && (
              <span className="text-lg text-muted-foreground ml-2">
                ({geoData.localCurrency})
              </span>
            )}
          </p>
        </motion.div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {methods.map((method, index) => (
            <motion.button
              key={method}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => setSelectedMethod(method)}
              className={`p-6 rounded-2xl border transition-all ${
                selectedMethod === method
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border bg-card/50 hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedMethod === method ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {getMethodIcon(method)}
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold mb-1">
                    {getMethodName(method)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getMethodDescription(method)}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12"
          >
            Back
          </Button>
          <Button
            onClick={() => selectedMethod && onMethodSelect(selectedMethod)}
            disabled={!selectedMethod}
            className="flex-1 h-12"
          >
            Continue
          </Button>
        </div>

        {/* Security Notice */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          🔒 All payments are secured with industry-standard encryption
        </p>
      </div>
    </motion.div>
  );
};
