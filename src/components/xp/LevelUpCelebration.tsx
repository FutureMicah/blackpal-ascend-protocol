import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, X } from "lucide-react";

interface Payload { level: number; tierName: string; btaxReward: number; unlock: string | null }

/**
 * Global listener: when the current user's rank_level increases, show a celebration.
 * Also exposes a window event `levelup-show` you can dispatch manually for previews.
 */
export function LevelUpCelebration() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    let prevLevel: number | null = null;
    let userId: string | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      const { data: p } = await supabase.from("profiles").select("rank_level").eq("id", user.id).maybeSingle();
      prevLevel = (p as any)?.rank_level ?? 1;

      const ch = supabase.channel(`levelup-${user.id}`)
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          async (e) => {
            const next = (e.new as any).rank_level ?? 1;
            if (prevLevel !== null && next > prevLevel) {
              const { data: tier } = await (supabase as any)
                .from("xp_tier_config").select("tier_name,btax_reward,unlock_feature")
                .eq("tier_level", next).maybeSingle();
              setPayload({
                level: next,
                tierName: tier?.tier_name || `Level ${next}`,
                btaxReward: Number(tier?.btax_reward ?? 0),
                unlock: tier?.unlock_feature ?? null,
              });
            }
            prevLevel = next;
          })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    };
    const cleanup = init();

    const onManual = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setPayload({ level: d.level || 1, tierName: d.tierName || "Level up", btaxReward: d.btaxReward || 0, unlock: d.unlock || null });
    };
    window.addEventListener("levelup-show", onManual);
    return () => {
      window.removeEventListener("levelup-show", onManual);
      cleanup.then(c => c && c());
    };
  }, []);

  useEffect(() => {
    if (!payload) return;
    const t = setTimeout(() => setPayload(null), 7000);
    return () => clearTimeout(t);
  }, [payload]);

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={() => setPayload(null)}
        >
          <motion.div
            initial={{ scale: 0.6, y: 30, rotate: -4 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="relative max-w-sm w-[88vw] rounded-3xl p-6 text-center bg-gradient-to-br from-amber-400/30 via-primary/20 to-purple-500/30 border border-amber-400/40 shadow-[0_0_120px_-20px_rgba(251,191,36,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setPayload(null)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white/70 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
            <motion.div
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse" }}
              className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.8)] mb-3"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-300 mb-1">Level Up</p>
            <h2 className="text-2xl font-bold text-white">Level {payload.level}</h2>
            <p className="text-sm text-amber-100/90 mt-1">{payload.tierName}</p>
            <div className="mt-4 space-y-1.5 text-xs text-white/85">
              {payload.btaxReward > 0 && (
                <p className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> +{payload.btaxReward} BTAX credited
                </p>
              )}
              {payload.unlock && (
                <p className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" /> Unlocked: {payload.unlock}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
