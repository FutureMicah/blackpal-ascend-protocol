import { useState, useEffect } from "react";
import { ArrivalAnimation } from "@/components/ArrivalAnimation";
import { GlassPortal } from "@/components/GlassPortal";
import { ProfileSetupEnhanced } from "@/components/ProfileSetupEnhanced";
import { WelcomeScene } from "@/components/WelcomeScene";
import { GeoDetection } from "@/components/GeoDetection";
import { PaymentTierCard } from "@/components/PaymentTierCard";
import { PaymentGateway } from "@/pages/PaymentGateway";
import { ParticleField } from "@/components/ParticleField";
import { CursorTrail } from "@/components/CursorTrail";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { GeoData, detectGeo } from "@/lib/geo";

type Stage = 
  | "arrival" 
  | "portal" 
  | "geo-detect"
  | "profile" 
  | "payment-tier"
  | "payment-gateway"
  | "welcome" 
  | "dashboard";

const Index = () => {
  const [stage, setStage] = useState<Stage>("arrival");
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [arrivalComplete, setArrivalComplete] = useState(false);

  // Auth state listener - only starts after arrival animation
  useEffect(() => {
    if (!arrivalComplete) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [arrivalComplete]);

  const checkProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, payment_completed, country, continent, payment_tier')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setHasProfile(true);
      setPaymentComplete(data.payment_completed || false);
      
      // If profile exists, check payment status
      if (data.payment_completed) {
        setStage("welcome");
      } else {
        // Has profile but no payment - go to payment tier
        if (data.country && data.continent && data.payment_tier) {
          const geoInfo = await detectGeo();
          setGeoData(geoInfo);
          setStage("payment-tier");
        } else {
          // Profile incomplete, go to profile setup
          setStage("profile");
        }
      }
    } else {
      setHasProfile(false);
      setStage("geo-detect");
    }
  };

  const handleAuthSuccess = () => {
    // Auth state listener will handle the rest
  };

  const handleGeoDetected = (detected: GeoData) => {
    setGeoData(detected);
    setStage("profile");
  };

  const handleProfileComplete = (profileGeoData: GeoData) => {
    setGeoData(profileGeoData);
    setStage("payment-tier");
  };

  const handlePaymentMethodSelect = (method: string) => {
    // TODO: Implement actual payment processing
    // For now, just mark as complete for demo
    console.log("Selected payment method:", method);
    
    // In real implementation, this would process payment
    // and update the database
    setPaymentComplete(true);
    setStage("welcome");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient effects */}
      {stage !== "arrival" && <ParticleField />}
      <CursorTrail />

      {/* Stage-based rendering */}
      {stage === "arrival" && (
        <ArrivalAnimation onComplete={() => {
          setArrivalComplete(true);
          setStage("portal");
        }} />
      )}

      {stage === "portal" && (
        <GlassPortal onSuccess={handleAuthSuccess} />
      )}

      {stage === "geo-detect" && geoData && (
        <GeoDetection 
          geoData={geoData} 
          onComplete={() => handleGeoDetected(geoData)} 
        />
      )}

      {stage === "profile" && user && (
        <ProfileSetupEnhanced 
          userId={user.id} 
          onComplete={handleProfileComplete} 
        />
      )}

      {stage === "payment-tier" && geoData && (
        <PaymentTierCard
          geoData={geoData}
          onContinue={() => setStage("payment-gateway")}
        />
      )}

      {stage === "payment-gateway" && geoData && (
        <PaymentGateway
          geoData={geoData}
          onMethodSelect={handlePaymentMethodSelect}
          onBack={() => setStage("payment-tier")}
        />
      )}

      {stage === "welcome" && user && hasProfile && paymentComplete && (
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
