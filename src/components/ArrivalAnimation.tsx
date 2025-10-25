import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import blackpalLogo from "@/assets/blackpal-logo.png";

interface ArrivalAnimationProps {
  onComplete: () => void;
}

export const ArrivalAnimation = ({ onComplete }: ArrivalAnimationProps) => {
  const [stage, setStage] = useState<"silence" | "streak" | "sigil" | "text">("silence");

  useEffect(() => {
    // Silence for 1 second
    const silenceTimer = setTimeout(() => setStage("streak"), 1000);
    
    // Streak appears
    const streakTimer = setTimeout(() => setStage("sigil"), 1800);
    
    // Sigil forms
    const sigilTimer = setTimeout(() => setStage("text"), 2800);
    
    // Complete and transition
    const completeTimer = setTimeout(() => onComplete(), 4800);

    return () => {
      clearTimeout(silenceTimer);
      clearTimeout(streakTimer);
      clearTimeout(sigilTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Light Streak */}
      {stage !== "silence" && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: "100%", opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ 
            boxShadow: "0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary))",
            top: "50%"
          }}
        />
      )}

      {/* Sigil Formation */}
      {(stage === "sigil" || stage === "text") && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col items-center gap-8"
        >
          <motion.img
            src={blackpalLogo}
            alt="BlackPAL"
            className="w-32 h-32 md:w-48 md:h-48 object-contain"
            style={{
              filter: "drop-shadow(0 0 30px hsl(var(--primary))) drop-shadow(0 0 60px hsl(var(--secondary)))"
            }}
            animate={{
              filter: [
                "drop-shadow(0 0 30px hsl(var(--primary))) drop-shadow(0 0 60px hsl(var(--secondary)))",
                "drop-shadow(0 0 40px hsl(var(--primary))) drop-shadow(0 0 80px hsl(var(--secondary)))",
                "drop-shadow(0 0 30px hsl(var(--primary))) drop-shadow(0 0 60px hsl(var(--secondary)))"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {stage === "text" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-center"
            >
              <h1 className="text-2xl md:text-4xl font-light tracking-wider text-foreground">
                Only the Focused Enter.
              </h1>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Particle ripples */}
      {stage !== "silence" && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 2, delay: i * 0.3, ease: "easeOut" }}
              className="absolute w-64 h-64 border border-primary/30 rounded-full"
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          ))}
        </>
      )}
    </div>
  );
};
