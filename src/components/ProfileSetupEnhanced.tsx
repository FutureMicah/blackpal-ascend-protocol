import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GeoData, detectGeo } from "@/lib/geo";
import { profileSchema } from "@/lib/validations";
import { Loader2 as LoaderIcon } from "lucide-react";
import confetti from "canvas-confetti";
import { useAchievements } from "@/hooks/use-achievements";
import { Profile } from "@/lib/profile-utils";

interface ProfileSetupEnhancedProps {
  userId: string;
  existingProfile?: Partial<Profile> | null;
  geoData?: GeoData | null;
  onComplete?: (geoData: GeoData) => void;
}

export const ProfileSetupEnhanced = ({
  userId,
  existingProfile,
  geoData: propGeoData,
  onComplete,
}: ProfileSetupEnhancedProps) => {
  const [displayName, setDisplayName] = useState(existingProfile?.display_name || "");
  const [bio, setBio] = useState(existingProfile?.bio || "");
  const [country, setCountry] = useState(existingProfile?.country || "");
  const [phoneNumber, setPhoneNumber] = useState(existingProfile?.phone_number || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(existingProfile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, "valid" | "invalid" | null>>({});
  const [geoData, setGeoData] = useState<GeoData | null>(propGeoData || null);
  const [hasReached100, setHasReached100] = useState(() => {
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem(`blackpal-profile-100:${userId}`) === "1") {
        return true;
      }
    } catch {}
    if (existingProfile?.display_name && existingProfile?.country) return true;
    return false;
  });
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();

  useEffect(() => {
    if (!geoData) detectGeo().then(setGeoData);
  }, [geoData]);

  const calculateCompletion = () => {
    let completed = 0;
    const total = 4;
    if (displayName && fieldStatus.display_name === "valid") completed++;
    if (country && fieldStatus.country === "valid") completed++;
    if (bio && fieldStatus.bio !== "invalid") completed++;
    if (phoneNumber === "" || (phoneNumber && fieldStatus.phone_number !== "invalid")) completed++;
    return Math.round((completed / total) * 100);
  };
  const dynamicCompletion = calculateCompletion();

  useEffect(() => {
    if (dynamicCompletion === 100 && !hasReached100) {
      setHasReached100(true);
      try {
        localStorage.setItem(`blackpal-profile-100:${userId}`, "1");
      } catch {}
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
      toast({
        title: "🎉 Profile Complete!",
        description: "Congratulations! You've completed your profile 100%",
      });
    }
  }, [dynamicCompletion, hasReached100, toast, userId]);

  useEffect(() => {
    if (!displayName) {
      setFieldStatus((p) => ({ ...p, display_name: null }));
      return;
    }
    const t = setTimeout(() => {
      const result = profileSchema.shape.display_name.safeParse(displayName);
      setFieldStatus((p) => ({ ...p, display_name: result.success ? "valid" : "invalid" }));
      if (!result.success) {
        setValidationErrors((p) => ({ ...p, display_name: result.error.issues[0].message }));
      } else {
        setValidationErrors((p) => {
          const { display_name, ...rest } = p;
          return rest;
        });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [displayName]);

  useEffect(() => {
    if (!country) {
      setFieldStatus((p) => ({ ...p, country: null }));
      return;
    }
    const t = setTimeout(() => {
      if (country.trim().length >= 2) {
        setFieldStatus((p) => ({ ...p, country: "valid" }));
        setValidationErrors((p) => {
          const { country: _c, ...rest } = p;
          return rest;
        });
      } else {
        setFieldStatus((p) => ({ ...p, country: "invalid" }));
        setValidationErrors((p) => ({ ...p, country: "Country is required" }));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [country]);

  const handleSubmit = async () => {
    if (!displayName?.trim() || !country?.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Display name and country are required.",
      });
      return;
    }
    setUploading(true);
    try {
      let avatar_url = existingProfile?.avatar_url || null;
      if (avatarFile) {
        const path = `${userId}/avatar-${Date.now()}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, {
          upsert: true,
        });
        if (!upErr) {
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
          avatar_url = pub.publicUrl;
        }
      }
      const payload: Record<string, unknown> = {
        display_name: displayName.trim(),
        bio: bio || null,
        country: country.trim(),
        phone_number: phoneNumber || null,
        avatar_url,
        updated_at: new Date().toISOString(),
      };
      if (geoData) {
        payload.continent = geoData.continent;
        payload.payment_tier = geoData.paymentTier;
        payload.is_nigeria = geoData.isNigeria;
        payload.is_africa = geoData.isAfrica;
      }
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (error) throw error;

      try {
        await checkAndAwardAchievements({
          user_id: userId,
          event_type: "profile_complete",
        });
      } catch {}

      toast({ title: "Profile saved", description: "Your profile has been updated." });
      if (onComplete && geoData) onComplete(geoData);
      else if (onComplete && !geoData) {
        const g = await detectGeo();
        onComplete(g);
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || "Try again",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg glass-strong rounded-2xl border border-primary/20 p-4 sm:p-6 space-y-3.5 sm:space-y-5"
      >
        <div>
          <h1 className="text-lg sm:text-2xl font-extrabold gradient-text-cyber leading-tight">
            Complete your profile
          </h1>
          <p className="text-[11px] sm:text-sm font-semibold text-muted-foreground mt-1">
            {dynamicCompletion}% complete
            {hasReached100 ? " · celebration unlocked" : ""}
          </p>
          <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${dynamicCompletion}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-sm font-bold">Display name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your trader name"
            className="h-10 sm:h-11 text-sm font-semibold"
          />
          {validationErrors.display_name && (
            <p className="text-[10px] font-semibold text-destructive">{validationErrors.display_name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-sm font-bold">Country</label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="h-10 sm:h-11 text-sm font-semibold"
          />
          {validationErrors.country && (
            <p className="text-[10px] font-semibold text-destructive">{validationErrors.country}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-sm font-bold">Bio (optional)</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short intro"
            rows={2}
            className="text-sm font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-sm font-bold">Phone (optional)</label>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+234..."
            className="h-10 sm:h-11 text-sm font-semibold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-sm font-bold">Avatar (optional)</label>
          <Input
            type="file"
            accept="image/*"
            className="text-xs font-medium"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setAvatarFile(f);
                setAvatarPreview(URL.createObjectURL(f));
              }
            }}
          />
          {avatarPreview && (
            <img
              src={avatarPreview}
              alt="Preview"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover"
            />
          )}
        </div>

        <Button
          className="w-full h-11 text-sm font-extrabold"
          disabled={uploading || dynamicCompletion < 50}
          onClick={handleSubmit}
        >
          {uploading ? (
            <>
              <LoaderIcon className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            "Save & continue"
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default ProfileSetupEnhanced;
