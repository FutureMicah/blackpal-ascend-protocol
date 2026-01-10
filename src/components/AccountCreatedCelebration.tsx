import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

interface AccountCreatedCelebrationProps {
  show: boolean;
  onComplete: () => void;
}

export const AccountCreatedCelebration = ({ show, onComplete }: AccountCreatedCelebrationProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (show && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      
      // Play success sound
      try {
        // Create audio context for reliable mobile playback
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create a pleasant "ping" sound using Web Audio API
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        // Second ping for harmony
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          
          osc2.frequency.setValueAtTime(1318.5, audioContext.currentTime); // E6 note
          osc2.type = "sine";
          
          gain2.gain.setValueAtTime(0.25, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
          
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.6);
        }, 150);
      } catch (e) {
        console.log("Audio not supported");
      }
      
      // Fire confetti
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Confetti from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'],
        });
      }, 250);

      // Complete after animation
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="flex flex-col items-center gap-6 p-8"
          >
            {/* Glowing green checkmark */}
            <div className="relative">
              {/* Ping animation rings */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-green-500/30"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-green-500/20"
              />
              
              {/* Main checkmark circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.2 }}
                className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"
                style={{
                  boxShadow: "0 0 60px rgba(34, 197, 94, 0.6), 0 0 120px rgba(34, 197, 94, 0.4), inset 0 0 30px rgba(255, 255, 255, 0.2)"
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.4 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2.5} />
                </motion.div>
              </motion.div>
            </div>

            {/* Success text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Account Created!
              </h2>
              <p className="text-muted-foreground">
                Welcome to BlackPAL Ascend
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
