// Sci-fi glassy 3D icon wrapper. Wraps a lucide icon in a glossy chrome bubble
// with depth shadows, inner highlight, and rim light. Mobile-optimized.
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlassIconProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg" | "xl";
  tint?: "violet" | "gold" | "chrome" | "ice" | "ember";
  className?: string;
  onClick?: () => void;
}

const sizes = {
  sm: { box: "w-9 h-9", icon: "w-4 h-4" },
  md: { box: "w-12 h-12", icon: "w-5 h-5" },
  lg: { box: "w-16 h-16", icon: "w-7 h-7" },
  xl: { box: "w-20 h-20", icon: "w-9 h-9" },
};

const tints = {
  violet: {
    grad: "from-violet-500/40 via-fuchsia-500/20 to-violet-900/60",
    rim: "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_6px_rgba(139,92,246,0.4),0_8px_20px_-4px_rgba(139,92,246,0.5)]",
    icon: "text-violet-100 drop-shadow-[0_2px_6px_rgba(139,92,246,0.8)]",
  },
  gold: {
    grad: "from-yellow-300/40 via-amber-500/20 to-yellow-900/60",
    rim: "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_6px_rgba(217,119,6,0.5),0_8px_20px_-4px_rgba(217,119,6,0.5)]",
    icon: "text-amber-100 drop-shadow-[0_2px_6px_rgba(217,119,6,0.8)]",
  },
  chrome: {
    grad: "from-slate-200/40 via-zinc-400/20 to-slate-900/70",
    rim: "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_6px_rgba(0,0,0,0.5),0_8px_20px_-4px_rgba(0,0,0,0.6)]",
    icon: "text-slate-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]",
  },
  ice: {
    grad: "from-cyan-300/40 via-sky-500/20 to-blue-900/60",
    rim: "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_6px_rgba(14,165,233,0.5),0_8px_20px_-4px_rgba(14,165,233,0.5)]",
    icon: "text-cyan-100 drop-shadow-[0_2px_6px_rgba(14,165,233,0.8)]",
  },
  ember: {
    grad: "from-orange-300/40 via-red-500/20 to-rose-900/60",
    rim: "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-2px_6px_rgba(239,68,68,0.5),0_8px_20px_-4px_rgba(239,68,68,0.5)]",
    icon: "text-orange-100 drop-shadow-[0_2px_6px_rgba(239,68,68,0.8)]",
  },
};

export const GlassIcon = ({ icon: Icon, size = "md", tint = "violet", className, onClick }: GlassIconProps) => {
  const s = sizes[size];
  const t = tints[tint];
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl flex items-center justify-center backdrop-blur-xl",
        "bg-gradient-to-br border border-white/20 transition-all duration-300",
        "hover:scale-110 hover:rotate-3 active:scale-95 cursor-pointer",
        s.box,
        t.grad,
        t.rim,
        className
      )}
    >
      {/* Top gloss highlight */}
      <div className="absolute inset-x-1 top-1 h-1/3 rounded-t-2xl bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
      {/* Specular dot */}
      <div className="absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-white/80 blur-[1px] pointer-events-none" />
      <Icon className={cn(s.icon, t.icon, "relative z-10")} />
    </div>
  );
};
