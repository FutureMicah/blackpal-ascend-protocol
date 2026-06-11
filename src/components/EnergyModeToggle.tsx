import { useEnergyMode } from "@/contexts/EnergyModeContext";
import { Zap, ZapOff } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * Header toggle for Energy Mode (Pulse vs Silent).
 * - Pulse:  full animations + soundscape
 * - Silent: minimal motion, no audio cues
 */
export const EnergyModeToggle = ({ className = "", compact = false }: Props) => {
  const { mode, toggle } = useEnergyMode();
  const silent = mode === "silent";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Energy mode: ${mode}. Click to switch.`}
      title={`Energy: ${silent ? "Silent" : "Pulse"} — click to switch`}
      className={
        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur transition-all " +
        (silent
          ? "border-white/15 bg-black/50 text-white/70 hover:border-white/30"
          : "border-amber-400/40 bg-amber-500/10 text-amber-200 hover:border-amber-300/70 shadow-[0_0_18px_-4px_rgba(251,191,36,0.6)]") +
        " " + className
      }
    >
      {silent ? (
        <ZapOff className="h-3 w-3" />
      ) : (
        <motion.span
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <Zap className="h-3 w-3 fill-amber-300/80" />
        </motion.span>
      )}
      {!compact && <span>{silent ? "Silent" : "Pulse"}</span>}
    </button>
  );
};
