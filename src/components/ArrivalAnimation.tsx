import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";

interface ArrivalAnimationProps {
  onComplete: () => void;
}

export const ArrivalAnimation = ({ onComplete }: ArrivalAnimationProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<"silence" | "streak" | "sigil" | "text" | "energy">("silence");

  useEffect(() => {
    if (prefersReducedMotion) {
      // Fast path for reduced motion
      const t = setTimeout(() => onComplete(), 800);
      return () => clearTimeout(t);
    }

    const silenceTimer = setTimeout(() => setStage("streak"), 900);
    const streakTimer = setTimeout(() => setStage("sigil"), 1600);
    const sigilTimer = setTimeout(() => setStage("text"), 2500);
    const energyTimer = setTimeout(() => setStage("energy"), 3400);
    const completeTimer = setTimeout(() => onComplete(), 4600);

    return () => {
      clearTimeout(silenceTimer);
      clearTimeout(streakTimer);
      clearTimeout(sigilTimer);
      clearTimeout(energyTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <img
          src="/blackpal-logo.png"
          alt="BlackPAL"
          className="w-28 h-28 object-contain opacity-90"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Light Streak */}
      {stage !== "silence" && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: "100%", opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          style={{
            boxShadow: "0 0 24px #22d3ee, 0 0 48px #06b6d4",
            top: "50%",
          }}
        />
      )}

      {/* Sigil + Text */}
      {(stage === "sigil" || stage === "text" || stage === "energy") && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            {/* Soft energy ring */}
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-400/40"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.35, opacity: [0.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              style={{ width: "100%", height: "100%" }}
            />
            <motion.img
              src="/blackpal-logo.png"
              alt="BlackPAL"
              className="relative w-28 h-28 md:w-40 md:h-40 object-contain"
              style={{
                filter: "drop-shadow(0 0 28px rgba(34, 211, 238, 0.55))",
              }}
              animate={{
                filter: [
                  "drop-shadow(0 0 24px rgba(34, 211, 238, 0.5))",
                  "drop-shadow(0 0 36px rgba(34, 211, 238, 0.75))",
                  "drop-shadow(0 0 24px rgba(34, 211, 238, 0.5))",
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {stage === "text" || stage === "energy" ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-2"
            >
              <h1 className="text-2xl md:text-4xl font-light tracking-[0.15em] text-foreground">
                Only the Focused Enter.
              </h1>
              {stage === "energy" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm md:text-base text-cyan-400/90 tracking-widest uppercase"
                >
                  + Ascend Protocol Unlocked
                </motion.p>
              )}
            </motion.div>
          ) : null}
        </motion.div>
      )}

      {/* Soft ripple rings (lightweight) */}
      {stage !== "silence" && (
        <>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.4, opacity: 0.4 }}
              animate={{ scale: 2.8, opacity: 0 }}
              transition={{
                duration: 1.8,
                delay: i * 0.35,
                ease: "easeOut",
              }}
              className="absolute w-48 h-48 md:w-64 md:h-64 border border-cyan-400/25 rounded-full"
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          ))}
        </>
      )}
    </div>
  );
};
