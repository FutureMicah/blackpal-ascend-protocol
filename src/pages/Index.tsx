import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrivalAnimation } from "@/components/ArrivalAnimation";
import { GlassPortal } from "@/components/GlassPortal";
const ProfileSetupEnhanced = lazy(() => import("@/components/ProfileSetupEnhanced").then(m => ({ default: m.ProfileSetupEnhanced })));
const WelcomeScene = lazy(() => import("@/components/WelcomeScene").then(m => ({ default: m.WelcomeScene })));
const PaymentTierCard = lazy(() => import("@/components/PaymentTierCard").then(m => ({ default: m.PaymentTierCard })));
const PaymentGateway = lazy(() => import("@/pages/PaymentGateway").then(m => ({ default: m.PaymentGateway })));
import { PaymentPendingScreen } from "@/components/PaymentPendingScreen";
import { ParticleField } from "@/components/ParticleField";
import { CursorTrail } from "@/components/CursorTrail";
import { FloatingCandlesticks } from "@/components/FloatingCandlesticks";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { GeoData, detectGeo } from "@/lib/geo";
import { checkProfileCompletion, Profile } from "@/lib/profile-utils";

type Stage = 
  | "arrival" 
  | "portal" 
  | "profile" 
  | "payment-tier"
  | "payment-gateway"
  | "payment-pending"
  | "welcome" 
  | "dashboard";

const PAYMENT_POLL_MS = 8000;

const Index = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("arrival");
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const [existingProfile, setExistingProfile] = useState<Partial<Profile> | null>(null);

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
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setHasProfile(true);
      setExistingProfile(data);
      setPaymentComplete(data.payment_completed || false);
      
      // Check profile completion status
      const completionStatus = checkProfileCompletion(data);
      
      // If profile is complete and the SERVER says payment is done (set by verified webhook)
      if (completionStatus.isComplete && data.payment_completed) {
        setStage("welcome");
      } 
      // Profile complete but no payment - skip to payment tier
      else if (completionStatus.readyForPayment) {
        // Use stored geo data, no need to re-detect
        const storedGeo: GeoData = {
          country: data.country || '',
          continent: data.continent || '',
          countryCode: data.country || '',
          paymentTier: data.payment_tier || 'INTERNATIONAL',
          amountUSD: data.payment_tier === 'NIGERIA' ? 20 : data.payment_tier === 'AFRICA' ? 100 : 200,
          isNigeria: data.is_nigeria || false,
          isAfrica: data.is_africa || false
        };
        setGeoData(storedGeo);
        // Has a payment already been recorded and is it still awaiting verification?
        const { data: pendingRow } = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', userId)
          .eq('payment_status', 'pending')
          .limit(1)
          .maybeSingle();
        setStage(pendingRow ? "payment-pending" : "payment-tier");
      } 
      // Profile incomplete - go to profile setup with existing data
      else {
        const geoInfo = await detectGeo();
        setGeoData(geoInfo);
        setStage("profile");
      }
    } else {
      // No profile found - detect geo first, then show profile setup
      setHasProfile(false);
      setExistingProfile(null);
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

  // Reads the authoritative payment status from Supabase. Local state is never trusted.
  // Only the server (paystack-verify / paystack-webhook) or an admin can set
  // profiles.payment_completed, enforced by DB triggers (migration 20261026120000).
  const fetchPaymentStatus = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('payment_completed')
      .eq('id', userId)
      .maybeSingle();
    if (error) return false;
    return data?.payment_completed === true;
  };

  // Called after the gateway has recorded a PENDING payment. Nothing is unlocked here.
  const handlePaymentMethodSelect = (_method: string) => {
    setPaymentComplete(false);
    setStage("payment-pending");
  };

  // While pending, re-check Supabase periodically. Unlock only when the server says so.
  useEffect(() => {
    if (stage !== "payment-pending" || !user) return;
    let cancelled = false;
    const check = async () => {
      const paid = await fetchPaymentStatus(user.id);
      if (cancelled) return;
      if (paid) {
        setPaymentComplete(true);
        setStage("welcome");
      }
    };
    check();
    const id = window.setInterval(check, PAYMENT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [stage, user]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background effects layer - always behind content */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <FloatingCandlesticks />
        {stage !== "arrival" && <ParticleField />}
        <CursorTrail />
      </div>


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

      <Suspense fallback={null}>
      {stage === "profile" && user && (
        <ProfileSetupEnhanced 
          userId={user.id}
          existingProfile={existingProfile}
          geoData={geoData}
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
          userId={user?.id}
          onMethodSelect={handlePaymentMethodSelect}
          onBack={() => setStage("payment-tier")}
        />
      )}

      {stage === "payment-pending" && (
        <PaymentPendingScreen
          onBack={() => setStage("payment-tier")}
        />
      )}

      {stage === "welcome" && user && hasProfile && paymentComplete && (
        <WelcomeScene 
          name={user.user_metadata?.name || "User"} 
          onEnter={() => navigate("/dashboard")} 
        />
      )}
      </Suspense>
    </div>
  );
};

export default Index;
