import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GeoData, detectGeo, calculatePaymentTier } from "@/lib/geo";
import { profileSchema } from "@/lib/validations";
import { Upload } from "lucide-react";
import { PremiumAvatar } from "./PremiumAvatar";
import { useAchievements } from "@/hooks/use-achievements";

interface ProfileSetupEnhancedProps {
  userId: string;
  onComplete?: (geoData: GeoData) => void;
}

export const ProfileSetupEnhanced = ({ userId, onComplete }: ProfileSetupEnhancedProps) => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();

  useEffect(() => {
    // Detect geo on mount
    detectGeo().then(setGeoData);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Avatar image must be less than 5MB",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setValidationErrors({});

    try {
      // Validate input
      const result = profileSchema.safeParse({
        display_name: displayName,
        bio,
        country,
        phone_number: phoneNumber
      });

      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
        setUploading(false);
        return;
      }

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      // Finalize geo data (allow manual country override)
      const finalGeoData = country && geoData 
        ? calculatePaymentTier({ countryCode: country, country, continent: geoData.continent })
        : geoData;

      if (!finalGeoData) throw new Error("Unable to detect location");

      // Create profile with geo data
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name: result.data.display_name,
          avatar_url: avatarUrl,
          country: finalGeoData.country,
          continent: finalGeoData.continent,
          bio: result.data.bio || null,
          phone_number: result.data.phone_number || null,
          is_nigeria: finalGeoData.isNigeria,
          is_africa: finalGeoData.isAfrica,
          payment_tier: finalGeoData.paymentTier,
        });

      if (profileError) throw profileError;

      // Award profile completion achievement
      await checkAndAwardAchievements({
        user_id: userId,
        event_type: 'profile_complete'
      });

      toast({
        title: "Profile created!",
        description: "Proceeding to your dashboard.",
      });

      if (onComplete) {
        onComplete(finalGeoData);
      } else {
        // Navigate to dashboard
        navigate("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create profile";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-background"
    >
      <div className="w-full max-w-lg">
        <motion.div
          className="p-8 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <h2 className="text-3xl font-bold text-center mb-2">
            Create Your Identity
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Your profile in the BTA Digital Republic
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <PremiumAvatar 
                src={avatarPreview || undefined}
                alt="Avatar preview"
                size={140}
              />
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {avatarPreview ? "Change Avatar" : "Upload Avatar"}
                  </span>
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Display Name */}
            <div>
              <Input
                placeholder="Display Name *"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={uploading}
                required
                className="h-12"
              />
              {validationErrors.display_name && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.display_name}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <Textarea
                placeholder="Bio (optional)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={uploading}
                className="min-h-[80px]"
              />
              {validationErrors.bio && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.bio}</p>
              )}
            </div>

            {/* Country */}
            <div>
              <Input
                placeholder={geoData ? `Country (detected: ${geoData.country})` : "Country"}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={uploading}
                className="h-12"
              />
            </div>

            {/* Phone Number */}
            <div>
              <Input
                placeholder="Phone Number (optional)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={uploading}
                className="h-12"
              />
              {validationErrors.phone_number && (
                <p className="text-red-400 text-xs mt-1">{validationErrors.phone_number}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={uploading}
            >
              {uploading ? "Creating Profile..." : "Continue"}
            </Button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};
