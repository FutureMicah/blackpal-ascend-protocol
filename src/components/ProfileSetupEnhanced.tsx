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
import { Upload, CheckCircle2, XCircle, Camera, Eye, Download, RotateCcw } from "lucide-react";
import { PremiumAvatar } from "./PremiumAvatar";
import { useAchievements } from "@/hooks/use-achievements";
import { 
  Profile, 
  getProfileCompletionPercentage, 
  saveProfileBackup, 
  loadProfileBackup, 
  clearProfileBackup,
  hasProfileBackup 
} from "@/lib/profile-utils";
import { ProfilePreview } from "./ProfilePreview";
import { AnimatePresence } from "framer-motion";

interface ProfileSetupEnhancedProps {
  userId: string;
  existingProfile?: Partial<Profile> | null;
  geoData?: GeoData | null;
  onComplete?: (geoData: GeoData) => void;
}

export const ProfileSetupEnhanced = ({ userId, existingProfile, geoData: propGeoData, onComplete }: ProfileSetupEnhancedProps) => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(existingProfile?.display_name || "");
  const [bio, setBio] = useState(existingProfile?.bio || "");
  const [country, setCountry] = useState(existingProfile?.country || "");
  const [phoneNumber, setPhoneNumber] = useState(existingProfile?.phone_number || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(existingProfile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, 'valid' | 'invalid' | null>>({});
  const [geoData, setGeoData] = useState<GeoData | null>(propGeoData || null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasBackup, setHasBackup] = useState(hasProfileBackup());
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();

  useEffect(() => {
    // Detect geo on mount if not provided
    if (!geoData) {
      detectGeo().then(setGeoData);
    }
  }, [geoData]);

  // Auto-save backup on field changes (debounced)
  useEffect(() => {
    if (!displayName) return;

    const timer = setTimeout(() => {
      saveProfileBackup({
        displayName,
        bio,
        country,
        phoneNumber,
        avatarPreview: avatarPreview || undefined
      });
      setHasBackup(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [displayName, bio, country, phoneNumber, avatarPreview]);

  // Real-time validation for display name
  useEffect(() => {
    if (!displayName) {
      setFieldStatus(prev => ({ ...prev, display_name: null }));
      return;
    }

    const timer = setTimeout(() => {
      const result = profileSchema.shape.display_name.safeParse(displayName);
      setFieldStatus(prev => ({ 
        ...prev, 
        display_name: result.success ? 'valid' : 'invalid' 
      }));
      
      if (!result.success) {
        setValidationErrors(prev => ({
          ...prev,
          display_name: result.error.issues[0].message
        }));
      } else {
        setValidationErrors(prev => {
          const { display_name, ...rest } = prev;
          return rest;
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [displayName]);

  const completionPercentage = getProfileCompletionPercentage(existingProfile as Profile | null);

  const handleRestoreBackup = () => {
    const backup = loadProfileBackup();
    if (backup) {
      setDisplayName(backup.data.displayName);
      setBio(backup.data.bio || "");
      setCountry(backup.data.country || "");
      setPhoneNumber(backup.data.phoneNumber || "");
      if (backup.data.avatarPreview) {
        setAvatarPreview(backup.data.avatarPreview);
      }
      
      toast({
        title: "Backup restored",
        description: "Your saved profile data has been restored",
      });
    }
  };

  const handleClearBackup = () => {
    clearProfileBackup();
    setHasBackup(false);
    toast({
      title: "Backup cleared",
      description: "Your saved profile backup has been removed",
    });
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Photo must be less than 5MB",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Photo captured!",
        description: "Your profile photo has been set",
      });
    }
  };

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

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation before showing preview
    if (!displayName.trim()) {
      toast({
        variant: "destructive",
        title: "Display name required",
        description: "Please enter your display name to preview your profile",
      });
      return;
    }
    
    setShowPreview(true);
  };

  const handleConfirmSubmit = () => {
    setShowPreview(false);
    handleSubmit();
  };

  const handleSubmit = async () => {
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

      // Update profile with geo data (use upsert to handle existing profile)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
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
        }, {
          onConflict: 'id'
        });

      if (profileError) throw profileError;

      // Award profile completion achievement
      await checkAndAwardAchievements({
        user_id: userId,
        event_type: 'profile_complete'
      });

      // Clear backup after successful profile creation
      clearProfileBackup();
      
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
    <>
      <AnimatePresence>
        {showPreview && (
          <ProfilePreview
            displayName={displayName}
            bio={bio}
            country={country}
            avatarUrl={avatarPreview || undefined}
            onClose={() => setShowPreview(false)}
            onConfirm={handleConfirmSubmit}
          />
        )}
      </AnimatePresence>

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
            {existingProfile ? 'Complete Your Profile' : 'Create Your Identity'}
          </h2>
          <p className="text-center text-muted-foreground mb-2">
            Your profile in the BTA Digital Republic
          </p>

          {/* Backup restore banner */}
          {hasBackup && !existingProfile && (
            <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Download className="w-4 h-4 text-accent" />
                <span className="text-accent">Saved data found</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRestoreBackup}
                  className="h-7 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearBackup}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          )}
          {existingProfile && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Profile Completion</span>
                <span className="font-semibold">{completionPercentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              {completionPercentage < 100 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Fill out the required fields below to continue
                </p>
              )}
            </div>
          )}

          <form onSubmit={handlePreview} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <PremiumAvatar 
                src={avatarPreview || undefined}
                alt="Avatar preview"
                size={140}
              />
              <div className="flex gap-2">
                {/* Camera Capture (mobile) */}
                <label htmlFor="camera-capture" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </span>
                  </Button>
                  <input
                    id="camera-capture"
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={handleCameraCapture}
                    disabled={uploading}
                  />
                </label>

                {/* File Upload */}
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {avatarPreview ? "Change" : "Upload"}
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
            </div>

            {/* Display Name */}
            <div className="relative">
              <div className="relative">
                <Input
                  placeholder="Display Name *"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={uploading}
                  required
                  className="h-12 pr-10"
                />
                {fieldStatus.display_name && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {fieldStatus.display_name === 'valid' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {validationErrors.display_name && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {validationErrors.display_name}
                </p>
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

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                className="flex-1 h-12 text-lg font-semibold"
                disabled={uploading || !displayName.trim()}
              >
                <Eye className="w-5 h-5 mr-2" />
                Preview
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 text-lg font-semibold"
                disabled={uploading}
              >
                {uploading ? "Creating..." : "Continue"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
    </>
  );
};
