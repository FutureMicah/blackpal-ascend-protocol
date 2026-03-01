/**
 * SessionLockScreen - Auto-locks app after inactivity
 * Requires biometric or password to resume session.
 * 
 * Usage: Place <SessionLockScreen /> in your app root or dashboard layout.
 * Configure timeout via the `timeoutMinutes` prop (default: 5).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BiometricAuth } from "@/components/BiometricAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/blackpal-logo.jpg";

interface SessionLockScreenProps {
  timeoutMinutes?: number;
}

export const SessionLockScreen = ({ timeoutMinutes = 5 }: SessionLockScreenProps) => {
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes]);

  useEffect(() => {
    // Get user email for unlock
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email);
    });

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    const handleActivity = () => {
      if (!isLocked) resetTimer();
    };

    events.forEach((e) => window.addEventListener(e, handleActivity));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLocked, resetTimer]);

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (error) throw error;
      setIsLocked(false);
      setPassword("");
      resetTimer();
      toast({ title: "Unlocked", description: "Session resumed." });
    } catch (err: any) {
      toast({ title: "Wrong Password", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = () => {
    setIsLocked(false);
    resetTimer();
    toast({ title: "Unlocked", description: "Biometric verification successful." });
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm mx-4 p-8 rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm text-center space-y-6"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img src={logo} alt="BlackPal" className="w-16 h-16 rounded-full opacity-80" />
                <Lock className="absolute -bottom-1 -right-1 w-6 h-6 text-primary bg-background rounded-full p-0.5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Session Locked</h2>
              <p className="text-sm text-muted-foreground">
                Your session was locked due to inactivity.
              </p>
            </div>

            {/* Biometric unlock */}
            <BiometricAuth
              mode="verify"
              email={userEmail}
              label="Unlock with Biometrics"
              onSuccess={handleBiometricUnlock}
            />

            <div className="relative flex items-center justify-center">
              <div className="border-t border-primary/20 flex-1" />
              <span className="px-3 text-xs text-muted-foreground">or enter password</span>
              <div className="border-t border-primary/20 flex-1" />
            </div>

            {/* Password unlock */}
            <form onSubmit={handlePasswordUnlock} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background/50 border-primary/30"
                required
              />
              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Unlock
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
