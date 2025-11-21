import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface GlassPortalProps {
  onSuccess: () => void;
}

export const GlassPortal = ({ onSuccess }: GlassPortalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        
        // Auth state change will trigger onSuccess
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        // Auth state change will trigger onSuccess
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
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
        style={{ perspective: "1000px" }}
      >
        {/* Glass card with 3D effect */}
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-8 backdrop-blur-xl"
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
  );
};
