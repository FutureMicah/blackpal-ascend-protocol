import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface AccessGrantedDetail {
  label?: string;        // headline (e.g. "ADMIN ACCESS")
  sublabel?: string;     // small line below
  durationMs?: number;   // total visible duration (default 2600)
}

/** Fire the holographic ACCESS GRANTED seal from anywhere. */
export function triggerAccessGranted(detail: AccessGrantedDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("access-granted", { detail }));
}

/**
 * Global mount: listens for `access-granted` events + realtime KYC/activation
 * approvals, then renders the holographic seal overlay.
 */
export const AccessGrantedSeal = () => {
  const [active, setActive] = useState<AccessGrantedDetail | null>(null);

  // Window event bus
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AccessGrantedDetail>).detail || {};
      setActive(detail);
      const dur = detail.durationMs ?? 2600;
      window.setTimeout(() => setActive(null), dur);
    };
    window.addEventListener("access-granted", handler);
    return () => window.removeEventListener("access-granted", handler);
  }, []);

  // Realtime listeners: KYC approval + activation payment success
  useEffect(() => {
    let cancelled = false;
    let channels: any[] = [];

    const subscribe = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;
      const uid = auth.user.id;

      const kyc = supabase
        .channel(`access-kyc-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "kyc_submissions", filter: `user_id=eq.${uid}` },
          (payload) => {
            const next = (payload.new as any)?.status;
            const prev = (payload.old as any)?.status;
            if (next === "approved" && prev !== "approved") {
              triggerAccessGranted({ label: "IDENTITY VERIFIED", sublabel: "KYC approved" });
            }
          }
        )
        .subscribe();

      const pay = supabase
        .channel(`access-pay-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "payments", filter: `user_id=eq.${uid}` },
          (payload) => {
            const next = (payload.new as any)?.status;
            const prev = (payload.old as any)?.status;
            if (next === "success" && prev !== "success") {
              triggerAccessGranted({ label: "ACTIVATION CONFIRMED", sublabel: "Welcome to BLACKPAL" });
            }
          }
        )
        .subscribe();

      channels = [kyc, pay];
    };

    subscribe();
    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="seal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
        >
          {/* Backdrop pulse */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-amber-500/15 via-transparent to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.3] }}
            transition={{ duration: 1.6, times: [0, 0.3, 1] }}
            style={{ background: "radial-gradient(circle at center, rgba(251,191,36,0.18), transparent 60%)" }}
          />
          {/* Scanline sweep */}
          <motion.div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          {/* Holographic seal */}
          <motion.div
            initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="relative"
          >
            {/* Outer rotating ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-dashed border-amber-300/70"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ width: 260, height: 260, left: -10, top: -10 }}
            />
            {/* Glow ring */}
            <motion.div
              className="absolute rounded-full"
              animate={{
                boxShadow: [
                  "0 0 40px 8px rgba(251,191,36,0.55), inset 0 0 30px rgba(251,191,36,0.4)",
                  "0 0 80px 16px rgba(251,191,36,0.8), inset 0 0 50px rgba(251,191,36,0.6)",
                  "0 0 40px 8px rgba(251,191,36,0.55), inset 0 0 30px rgba(251,191,36,0.4)",
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 240, height: 240 }}
            />

            <div
              className="relative flex flex-col items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-black via-amber-950/60 to-black"
              style={{ width: 240, height: 240 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
              >
                <ShieldCheck className="h-16 w-16 text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.8)]" strokeWidth={2.2} />
              </motion.div>
              <motion.div
                className="mt-2 text-[10px] font-black tracking-[0.35em] text-amber-200/90"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                ACCESS GRANTED
              </motion.div>
              {active.label && (
                <motion.div
                  className="mt-1 text-sm font-extrabold tracking-wider text-white"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {active.label}
                </motion.div>
              )}
              {active.sublabel && (
                <motion.div
                  className="mt-0.5 text-[10px] uppercase tracking-widest text-amber-200/70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                >
                  {active.sublabel}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
