import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrivalAnimation } from "@/components/ArrivalAnimation";
import { GlassPortal } from "@/components/GlassPortal";
const ProfileSetupEnhanced = lazy(() =>
  import("@/components/ProfileSetupEnhanced").then((m) => ({ default: m.ProfileSetupEnhanced }))
);
const WelcomeScene = lazy(() =>
  import("@/components/WelcomeScene").then((m) => ({ default: m.WelcomeScene }))
);
const PaymentTierCard = lazy(() =>
  import("@/components/PaymentTierCard").then((m) => ({ default: m.PaymentTierCard }))
);
const PaymentGateway = lazy(() =>
  import("@/pages/PaymentGateway").then((m) => ({ default: m.PaymentGateway }))
);
import { ParticleField } from "@/components/ParticleField";
import { CursorTrail } from "@/components/CursorTrail";
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
  const [existingProfile, setExistingProfile] = useState<Partial<Profile> | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Returning paid users: skip arrival + welcome entirely
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("payment_completed, display_name, country")
            .eq("id", session.user.id)
            .maybeSingle();
          if (cancelled) return;
          if (data?.payment_completed) {
            try {
              localStorage.setItem(`blackpal-welcome-seen:${session.user.id}`, "1");
              localStorage.setItem(`blackpal-profile-100:${session.user.id}`, "1");
            } catch {}
            navigate("/dashboard", { replace: true });
            return;
          }
        }
      } catch {
        /* fall through to normal flow */
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!arrivalComplete || bootstrapping) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [arrivalComplete, bootstrapping]);

  const checkProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (!error && data) {
      setHasProfile(true);
      setExistingProfile(data);
      setPaymentComplete(!!data.payment_completed);

      // Paid users never see welcome/confetti again
      if (data.payment_completed) {
        try {
          localStorage.setItem(`blackpal-welcome-seen:${userId}`, "1");
          localStorage.setItem(`blackpal-profile-100:${userId}`, "1");
        } catch {}
        navigate("/dashboard", { replace: true });
        return;
      }

      const completionStatus = checkProfileCompletion(data);

      if (completionStatus.readyForPayment) {
        const storedGeo: GeoData = {
          country: data.country || "",
          continent: data.continent || "",
          countryCode: data.country || "",
          paymentTier: data.payment_tier || "INTERNATIONAL",
          amountUSD:
            data.payment_tier === "NIGERIA" ? 20 : data.payment_tier === "AFRICA" ? 100 : 200,
          isNigeria: data.is_nigeria || false,
          isAfrica: data.is_africa || false,
        };
        setGeoData(storedGeo);
        setStage("payment-tier");
      } else {
        const geoInfo = await detectGeo();
        setGeoData(geoInfo);
        setStage("profile");
      }
    } else {
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

  const handlePaymentMethodSelect = (method: string) => {
    console.log("Selected payment method:", method);
    setPaymentComplete(true);
    // First-time only after payment
    setStage("welcome");
  };

  if (bootstrapping) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {stage !== "arrival" && <ParticleField />}
        <CursorTrail />
      </div>

      {stage === "arrival" && (
        <ArrivalAnimation
          onComplete={() => {
            setArrivalComplete(true);
            setStage("portal");
          }}
        />
      )}

      {stage === "portal" && <GlassPortal onSuccess={handleAuthSuccess} />}

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
          <PaymentTierCard geoData={geoData} onContinue={() => setStage("payment-gateway")} />
        )}

        {stage === "payment-gateway" && geoData && (
          <PaymentGateway
            geoData={geoData}
            userId={user?.id}
            onMethodSelect={handlePaymentMethodSelect}
            onBack={() => setStage("payment-tier")}
          />
        )}

        {stage === "welcome" && user && hasProfile && paymentComplete && (
          <WelcomeScene
            name={user.user_metadata?.name || "User"}
            onEnter={() => {
              try {
                localStorage.setItem(`blackpal-welcome-seen:${user.id}`, "1");
                localStorage.setItem(`blackpal-profile-100:${user.id}`, "1");
              } catch {}
              navigate("/dashboard", { replace: true });
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default Index;
