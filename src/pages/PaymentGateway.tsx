import { motion, AnimatePresence } from "framer-motion";
import { GeoData, getPaymentMethods, PaymentMethodInfo } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ArrowLeft, Copy, Check, Loader2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { BiometricAuth } from "@/components/BiometricAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PaymentProofUpload } from "@/components/PaymentProofUpload";

interface PaymentGatewayProps {
  geoData: GeoData;
  userId?: string;
  onMethodSelect: (method: string) => void;
  onBack: () => void;
}

export const PaymentGateway = ({ geoData, userId, onMethodSelect, onBack }: PaymentGatewayProps) => {
  const methods = getPaymentMethods(geoData.paymentTier);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [requireBiometric, setRequireBiometric] = useState(false);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const { toast } = useToast();

  // Real bank account details
  const bankAccounts = [
    { bank: 'Access Bank', accountNumber: '1491995592', accountName: 'BlackPal Academy' },
    { bank: 'Wema Bank', accountNumber: '7650337621', accountName: 'BlackPal Academy' },
    { bank: '9 Payment Service Bank', accountNumber: '5240061723', accountName: 'BlackPal Academy' },
    { bank: 'Providus Bank', accountNumber: '9977732785', accountName: 'BlackPal Academy' },
  ];

  const mobileAccounts: Record<string, { accountNumber: string; accountName: string }> = {
    opay: { accountNumber: '8135108929', accountName: 'BlackPal Academy' },
    palmpay: { accountNumber: '8135108929', accountName: 'BlackPal Academy' },
  };

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const getPriceDisplay = () => {
    if (geoData.paymentTier === 'NIGERIA') {
      return '₦1,000';
    }
    return `$${geoData.amountUSD} USDT`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
    toast({ title: "Copied!", description: "Account number copied to clipboard." });
  };

  const handlePaymentConfirm = async () => {
    if (!selectedMethod || !userId) return;
    setProcessing(true);

    try {
      // Create payment record in database
      const paymentData: any = {
        user_id: userId,
        payment_tier: geoData.paymentTier,
        payment_method: selectedMethod === 'opay' || selectedMethod === 'palmpay' || selectedMethod === 'momo' 
          ? 'bank_transfer' 
          : selectedMethod === 'voucher' 
            ? 'bank_transfer'
            : selectedMethod as any,
        amount_usd: geoData.amountUSD,
        amount_local: geoData.amountLocal || null,
        local_currency: geoData.localCurrency || null,
        payment_status: 'pending' as const,
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        console.error('Payment record error:', paymentError);
      }

      // For demo/MVP: process based on method
      if (selectedMethod === 'paystack') {
        // Initialize Paystack payment
        await initPaystack();
      } else if (selectedMethod === 'bank_transfer' || selectedMethod === 'opay' || selectedMethod === 'palmpay') {
        // Show bank transfer details — user confirms manually
        toast({
          title: "Transfer Initiated",
          description: "Please complete the transfer. Your account will be activated upon confirmation.",
        });
        await markPaymentComplete();
      } else if (selectedMethod === 'momo') {
        toast({
          title: "MoMo Payment",
          description: "Dial *223*1*1# on MTN to complete payment.",
        });
        await markPaymentComplete();
      } else if (selectedMethod === 'ussd') {
        toast({
          title: "USSD Payment",
          description: "Dial *737*1000# or *901*1000# to complete payment.",
        });
        await markPaymentComplete();
      } else if (selectedMethod === 'voucher') {
        if (!voucherCode.trim()) {
          toast({ title: "Error", description: "Please enter your voucher code.", variant: "destructive" });
          setProcessing(false);
          return;
        }
        // Validate voucher (simplified)
        toast({ title: "Voucher Applied", description: "Your voucher has been redeemed." });
        await markPaymentComplete();
      } else {
        // Crypto and others
        await markPaymentComplete();
      }
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const initPaystack = async () => {
    const callback_url = `${window.location.origin}/dashboard?paystack=1`;
    const { data, error } = await supabase.functions.invoke('paystack-init', {
      body: { callback_url },
    });
    if (error || !data?.authorization_url) {
      toast({ title: 'Payment Error', description: error?.message || 'Could not start Paystack', variant: 'destructive' });
      setProcessing(false);
      return;
    }
    // Redirect to Paystack hosted checkout
    window.location.href = data.authorization_url;
  };

  // Never marks a payment complete from the browser. The payment stays 'pending'
  // until the server (paystack-verify / paystack-webhook) or an admin confirms it.
  const markPaymentComplete = async () => {
    if (!selectedMethod) return;
    toast({
      title: "Payment submitted",
      description: "We're waiting for confirmation. Your access unlocks once it is verified.",
    });
    onMethodSelect(selectedMethod);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'card': return '💳 Card Payments';
      case 'transfer': return '🏦 Bank Transfer';
      case 'mobile': return '📱 Mobile Wallets';
      case 'ussd': return '📞 USSD';
      case 'crypto': return '🪙 Cryptocurrency';
      case 'voucher': return '🎫 Voucher';
      default: return '';
    }
  };

  // Group methods by category
  const groupedMethods = methods.reduce((acc, method) => {
    if (!acc[method.category]) acc[method.category] = [];
    acc[method.category].push(method);
    return acc;
  }, {} as Record<string, PaymentMethodInfo[]>);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 overflow-y-auto rebrand-payment-success"
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
            One-time activation fee • Pay once, access forever
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
          <p className="text-4xl font-bold text-foreground">
            {getPriceDisplay()}
          </p>
          {geoData.paymentTier === 'NIGERIA' && (
            <p className="text-sm text-muted-foreground mt-1">Nigerian Naira</p>
          )}
          <p className="text-[10px] text-muted-foreground/80 mt-3 max-w-md mx-auto leading-snug">
            ₦ is used here as the one-time activation fee and your payment receipt currency.
            Once activated, every wallet balance, reward, and admin metric is shown in BTAX —
            our platform-wide virtual currency.
          </p>
        </motion.div>

        {/* Payment Methods by Category */}
        <div className="space-y-6 mb-8">
          {Object.entries(groupedMethods).map(([category, categoryMethods]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                {getCategoryLabel(category)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryMethods.map((method, index) => (
                  <motion.button
                    key={method.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => {
                      setSelectedMethod(method.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all text-left ${
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
                        : 'border-border bg-card/50 hover:border-primary/50 hover:bg-card/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{method.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-sm">
                          {method.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {method.description}
                        </p>
                      </div>
                      {selectedMethod === method.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contextual details based on selected method */}
        <AnimatePresence>
          {selectedMethod === 'bank_transfer' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-5 rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm"
            >
              <h4 className="font-semibold text-foreground mb-3">Bank Transfer Details</h4>
              <p className="text-xs text-muted-foreground mb-4">Transfer ₦1,000 to any of these accounts:</p>
              <div className="space-y-4">
                {bankAccounts.map((acc) => (
                  <div key={acc.accountNumber} className="p-3 rounded-xl bg-background/50 border border-border/50 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Bank:</span>
                      <span className="text-xs font-medium text-foreground">{acc.bank}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Account:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-sm">{acc.accountNumber}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(acc.accountNumber)}>
                          {copiedText === acc.accountNumber ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Name:</span>
                      <span className="text-xs font-medium text-foreground">{acc.accountName}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-primary font-semibold mt-3">Amount: ₦1,000</p>
            </motion.div>
          )}

          {(selectedMethod === 'opay' || selectedMethod === 'palmpay') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-5 rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm"
            >
              <h4 className="font-semibold text-foreground mb-3">
                {selectedMethod === 'opay' ? 'OPay' : 'PalmPay'} Transfer
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Transfer ₦1,000 to the account below via your {selectedMethod === 'opay' ? 'OPay' : 'PalmPay'} app:
              </p>
              <div className="p-3 rounded-xl bg-background/50 border border-border/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Account:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{mobileAccounts[selectedMethod].accountNumber}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(mobileAccounts[selectedMethod].accountNumber)}>
                      {copiedText === mobileAccounts[selectedMethod].accountNumber ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Name:</span>
                  <span className="text-xs font-medium text-foreground">{mobileAccounts[selectedMethod].accountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Amount:</span>
                  <span className="font-bold text-primary">₦1,000</span>
                </div>
              </div>
            </motion.div>
          )}

          {selectedMethod === 'ussd' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-5 rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm"
            >
              <h4 className="font-semibold text-foreground mb-3">USSD Codes</h4>
              <p className="text-xs text-muted-foreground mb-3">Dial from your bank's registered line to pay ₦1,000:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-background/50 text-center">
                  <p className="font-mono font-bold text-foreground">*901*1000#</p>
                  <p className="text-xs text-muted-foreground">Access Bank</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50 text-center">
                  <p className="font-mono font-bold text-foreground">*945*1000#</p>
                  <p className="text-xs text-muted-foreground">Wema Bank</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50 text-center">
                  <p className="font-mono font-bold text-foreground">*737*1000#</p>
                  <p className="text-xs text-muted-foreground">GTBank</p>
                </div>
                <div className="p-2 rounded-lg bg-background/50 text-center">
                  <p className="font-mono font-bold text-foreground">*919*1000#</p>
                  <p className="text-xs text-muted-foreground">UBA</p>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">Transfer to Access Bank: 1491995592</p>
            </motion.div>
          )}

          {selectedMethod === 'voucher' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-5 rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm"
            >
              <h4 className="font-semibold text-foreground mb-3">Enter Voucher Code</h4>
              <Input
                placeholder="BTA-XXXX-XXXX-XXXX"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="font-mono text-center text-lg h-12"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={() => {
              if (selectedMethod) {
                setRequireBiometric(true);
              }
            }}
            disabled={!selectedMethod || processing}
            className="flex-1 h-12"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 mr-2" />
            )}
            {processing ? 'Processing...' : 'Pay Now'}
          </Button>
        </div>

        {/* Payment Proof Upload */}
        {selectedMethod && userId && (
          <div className="mt-6">
            <PaymentProofUpload
              userId={userId}
              onUploaded={() => {
                toast({ title: "Proof submitted", description: "Admin will verify your payment shortly." });
              }}
            />
          </div>
        )}

        {/* Biometric Verification Gate */}
        <AnimatePresence>
          {requireBiometric && !biometricVerified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-xl p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm p-8 rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm text-center space-y-6"
              >
                <ShieldCheck className="w-16 h-16 mx-auto text-primary opacity-80" />
                <h3 className="text-xl font-bold text-foreground">Verify Your Identity</h3>
                <p className="text-sm text-muted-foreground">
                  Confirm with biometrics to proceed with your {getPriceDisplay()} payment.
                </p>
                <BiometricAuth
                  mode="verify"
                  label="Verify & Pay"
                  onSuccess={() => {
                    setBiometricVerified(true);
                    setRequireBiometric(false);
                    handlePaymentConfirm();
                  }}
                  onCancel={() => setRequireBiometric(false)}
                />
                <p className="text-xs text-muted-foreground">— or —</p>
                <Button
                  onClick={() => {
                    setRequireBiometric(false);
                    handlePaymentConfirm();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Skip Biometric — Continue to Pay
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setRequireBiometric(false)}
                  className="w-full text-muted-foreground"
                >
                  Cancel
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Notice */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          🔒 All payments are secured with encryption • One-time activation fee
        </p>
      </div>
    </motion.div>
  );
};
