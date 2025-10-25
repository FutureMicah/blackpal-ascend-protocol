import { useState, useEffect } from "react";
import { ArrivalAnimation } from "@/components/ArrivalAnimation";
import { GlassPortal } from "@/components/GlassPortal";
import { ProfileSetup } from "@/components/ProfileSetup";
import { WelcomeScene } from "@/components/WelcomeScene";
import { ParticleField } from "@/components/ParticleField";
import { CursorTrail } from "@/components/CursorTrail";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";

type Stage = "arrival" | "portal" | "profile" | "welcome" | "dashboard";

const Index = () => {
  const [stage, setStage] = useState<Stage>("arrival");
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  // Auth state listener
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setHasProfile(true);
      setStage("welcome");
    } else {
      setHasProfile(false);
      setStage("profile");
    }
  };

  const handleAuthSuccess = () => {
    // Auth state listener will handle the rest
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient effects - always present */}
      {stage !== "arrival" && <ParticleField />}
      <CursorTrail />

      {/* Stage-based rendering */}
      {stage === "arrival" && (
        <ArrivalAnimation onComplete={() => setStage("portal")} />
      )}

      {stage === "portal" && (
        <>
          <ParticleField />
          <GlassPortal onSuccess={handleAuthSuccess} />
        </>
      )}

      {stage === "profile" && user && (
        <>
          <ParticleField />
          <ProfileSetup 
            userId={user.id} 
            onComplete={() => setStage("welcome")} 
          />
        </>
      )}

      {stage === "welcome" && user && hasProfile && (
        <WelcomeScene 
          name={user.user_metadata?.name || "User"} 
          onEnter={() => setStage("dashboard")} 
        />
      )}

      {stage === "dashboard" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex min-h-screen items-center justify-center p-8"
        >
          <div className="text-center space-y-6 max-w-2xl">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold tracking-tight"
            >
              Dashboard
              <span className="block text-3xl md:text-4xl mt-4 text-primary font-light">
                Coming Soon
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground max-w-lg mx-auto"
            >
              Your BlackPAL Ascend experience is being crafted with precision. 
              Every feature designed for power users who demand excellence.
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-8"
            >
              <div className="inline-block p-6 rounded-xl border border-primary/30 bg-card/50 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground mb-2">System Status</p>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary animate-glow-pulse" />
                  <span className="text-foreground font-medium">All Systems Active</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Index;
