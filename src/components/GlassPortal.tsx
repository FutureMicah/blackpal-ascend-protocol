import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { AccountCreatedCelebration } from "./AccountCreatedCelebration";

interface GlassPortalProps {
  onSuccess: () => void;
}

export const GlassPortal = ({ onSuccess }: GlassPortalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
    } catch (err: any) {
      setError("Failed to sign in with Google. Please try again.");
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: err.message || "Please try again or use email/password.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    onSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name
            }
          }
        });

        if (signUpError) throw signUpError;
        
        // Show celebration for new signups
        setShowCelebration(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        // Direct login without celebration
        onSuccess();
      }
    } catch (err: any) {
      // Normalize error messages to prevent user enumeration
      if (mode === 'signup') {
        setError('Unable to create account. Please try again or use a different email.');
      } else {
        setError('Invalid email or password. Please try again.');
      }
      console.error('Auth error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AccountCreatedCelebration 
        show={showCelebration} 
        onComplete={handleCelebrationComplete} 
      />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md my-auto"
        style={{ perspective: "1000px" }}
      >
        {/* Glass card with 3D effect */}
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
          style={{
            background: "linear-gradient(135deg, hsl(var(--glass-blur) / 0.6), hsl(var(--glass-blur) / 0.4))",
            boxShadow: "var(--shadow-glass), inset 0 0 60px hsl(var(--primary) / 0.05)",
            transformStyle: "preserve-3d"
          }}
          whileHover={{ 
            boxShadow: "var(--shadow-glass), var(--shadow-voltage), inset 0 0 60px hsl(var(--primary) / 0.1)" 
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Holographic reflection layer */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)",
              mixBlendMode: "overlay"
            }}
          />

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.img
              src="/blackpal-logo.png"
              alt="BlackPAL"
              className="w-16 h-16 object-contain"
              animate={{
                filter: [
                  "drop-shadow(0 0 10px hsl(var(--primary)))",
                  "drop-shadow(0 0 20px hsl(var(--primary)))",
                  "drop-shadow(0 0 10px hsl(var(--primary)))"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-semibold mb-2">
              {mode === "signup" ? "CREATE YOUR IDENTITY" : "WELCOME BACK"}
            </h2>
            <p className="text-primary font-light tracking-wide">
              {mode === "signup" ? "ENTER ASCEND MODE." : "RESUME YOUR JOURNEY."}
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Google Sign In Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-12"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative my-6">
            <Separator className="bg-border/50" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/80 px-3 text-xs text-muted-foreground">
              or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="voltage-input"
                  placeholder="Enter your name"
                  required
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="voltage-input"
                placeholder="your@email.com"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="voltage-input"
                placeholder="••••••••"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                type="submit"
                className="w-full voltage-button"
                size="lg"
                disabled={loading}
              >
                {loading
                  ? "Authenticating..."
                  : mode === "signup"
                  ? "Initialize Access"
                  : "Enter Portal"}
              </Button>
            </motion.div>
          </form>

          {/* Mode toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-sm"
          >
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "login" 
                ? "Need access? Create identity" 
                : "Already have access? Login"}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
      </div>
    </>
  );
};
