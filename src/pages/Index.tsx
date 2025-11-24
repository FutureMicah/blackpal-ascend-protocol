import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrivalAnimation } from "@/components/ArrivalAnimation";
import { GlassPortal } from "@/components/GlassPortal";
import { ProfileSetupEnhanced } from "@/components/ProfileSetupEnhanced";
import { WelcomeScene } from "@/components/WelcomeScene";
import { PaymentTierCard } from "@/components/PaymentTierCard";
import { PaymentGateway } from "@/pages/PaymentGateway";
import { ParticleField } from "@/components/ParticleField";
import { CursorTrail } from "@/components/CursorTrail";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { GeoData, detectGeo } from "@/lib/geo";

type Stage = 
  | "arrival" 
  | "portal" 
  | "profile" 
  | "payment-tier"
  | "payment-gateway"
  | "welcome" 
  | "dashboard";

const Index = () => {
  const navigate = useNavigate();
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
      // No profile found - detect geo first, then show profile setup
      setHasProfile(false);
      const geoInfo = await detectGeo();
      setGeoData(geoInfo);
      setStage("profile");
    }
  };

  const handleAuthSuccess = () => {
    // Auth state listener will handle the rest
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
          onEnter={() => navigate("/dashboard")} 
        />
      )}
    </div>
  );
};

export default Index;
