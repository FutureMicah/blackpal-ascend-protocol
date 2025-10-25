import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import blackpalLogo from "@/assets/blackpal-logo.png";

interface GlassPortalProps {
  onSuccess: () => void;
}

export const GlassPortal = ({ onSuccess }: GlassPortalProps) => {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth - in real app, connect to Firebase/Supabase
    setTimeout(() => {
      onSuccess();
    }, 800);
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
              src={blackpalLogo}
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
              >
                {mode === "signup" ? "Initialize Access" : "Enter Portal"}
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
