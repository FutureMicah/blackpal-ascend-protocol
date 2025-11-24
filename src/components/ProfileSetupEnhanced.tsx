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
import { Upload, CheckCircle2, XCircle, Camera, Eye, Download, RotateCcw, Share2, History, Palette, TrendingUp, Users, BarChart3 } from "lucide-react";
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
import { ImageEditor } from "./ImageEditor";
import { ProfileShareModal } from "./ProfileShareModal";
import { ProfileHistoryTimeline } from "./ProfileHistoryTimeline";
import { ProfileThemeCustomizer } from "./ProfileThemeCustomizer";
import { ProfileAnalyticsDashboard } from "./ProfileAnalyticsDashboard";
import { SocialShare } from "./SocialShare";
import { ProfileComparison } from "./ProfileComparison";
import { ProfileCompletion } from "./ProfileCompletion";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageForEdit, setTempImageForEdit] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [profile, setProfile] = useState<any>(existingProfile);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalXP: 0, totalAchievements: 0, rareAchievements: 0 });
  const { toast } = useToast();
  const { checkAndAwardAchievements } = useAchievements();

  useEffect(() => {
    // Detect geo on mount if not provided
    if (!geoData) {
      detectGeo().then(setGeoData);
    }
    
    // Load profile data for social share and comparison
    loadProfile();
  }, [geoData]);

  const loadProfile = async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // Load achievements
        const { data: achievementsData } = await supabase
          .from("user_achievements")
          .select(`
            achievement_id,
            achievements (
              id,
              name,
              icon,
              rarity,
              description
            )
          `)
          .eq("user_id", userId);
        
        const userAchievements = achievementsData?.map((ua: any) => ua.achievements).filter(Boolean) || [];
        setAchievements(userAchievements);
        
        const totalXP = profileData.xp_points || 0;
        const totalAchievements = userAchievements.length;
        const rareAchievements = userAchievements.filter(
          (a: any) => a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary"
        ).length;
        
        setStats({
          totalXP,
          totalAchievements,
          rareAchievements,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

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
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setTempImageForEdit(imageUrl);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
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
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setTempImageForEdit(imageUrl);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageEdited = (editedImageUrl: string) => {
    setAvatarPreview(editedImageUrl);
    fetch(editedImageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        setAvatarFile(file);
      });
    setShowImageEditor(false);
    setTempImageForEdit(null);
  };

  const handleHistoryRevert = (historyEntry: any) => {
    if (existingProfile) {
      setDisplayName(historyEntry.display_name || "");
      setBio(historyEntry.bio || "");
      setCountry(historyEntry.country || "");
      setPhoneNumber(historyEntry.phone_number || "");
      if (historyEntry.avatar_url) {
        setAvatarPreview(historyEntry.avatar_url);
      }
    }
  };

  const handleThemeSave = async (theme: any) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          theme_background: theme.background,
          theme_font: theme.font,
          theme_layout: theme.layout,
          theme_accent_color: theme.accentColor,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Theme saved!",
        description: "Your profile theme has been updated",
      });
      
      loadProfile(); // Reload to trigger gamification
    } catch (error) {
      console.error("Error saving theme:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save theme",
      });
    }
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const finalGeoData = country && geoData 
        ? calculatePaymentTier({ countryCode: country, country, continent: geoData.continent })
        : geoData;

      if (!finalGeoData) throw new Error("Unable to detect location");

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

      await checkAndAwardAchievements({
        user_id: userId,
        event_type: 'profile_complete'
      });

      clearProfileBackup();
      
      toast({
        title: "Profile created!",
        description: "Proceeding to your dashboard.",
      });

      if (onComplete) {
        onComplete(finalGeoData);
      } else {
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

      <AnimatePresence>
        {showImageEditor && tempImageForEdit && (
          <ImageEditor
            imageSrc={tempImageForEdit}
            onSave={handleImageEdited}
            onCancel={() => {
              setShowImageEditor(false);
              setTempImageForEdit(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareModal && (
          <ProfileShareModal
            userId={userId}
            displayName={displayName}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistory && (
          <ProfileHistoryTimeline
            userId={userId}
            onClose={() => setShowHistory(false)}
            onRevert={handleHistoryRevert}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showThemeCustomizer && existingProfile && (
          <ProfileThemeCustomizer
            currentTheme={{
              background: existingProfile.theme_background || "default",
              font: existingProfile.theme_font || "inter",
              layout: existingProfile.theme_layout || "standard",
              accentColor: existingProfile.theme_accent_color || "purple",
            }}
            onSave={handleThemeSave}
            onClose={() => setShowThemeCustomizer(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnalytics && (
          <ProfileAnalyticsDashboard
            userId={userId}
            onClose={() => setShowAnalytics(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSocialShare && profile && (
          <SocialShare
            profile={profile}
            achievements={achievements}
            stats={stats}
            onClose={() => setShowSocialShare(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComparison && profile && (
          <ProfileComparison
            currentProfile={profile}
            currentStats={stats}
            onClose={() => setShowComparison(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-background overflow-auto"
      >
        <div className="w-full max-w-5xl py-8">
          <motion.div
            className="p-8 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <h2 className="text-3xl font-bold text-center mb-2">
              {existingProfile ? 'Complete Your Profile' : 'Create Your Identity'}
            </h2>
            <p className="text-center text-muted-foreground mb-6">
              Your profile in the BTA Digital Republic
            </p>

            {/* Action buttons */}
            {existingProfile && (
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnalytics(true)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowThemeCustomizer(true)}
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Theme
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSocialShare(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Card
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComparison(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Compare
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Profile Form */}
              <div className="lg:col-span-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        {avatarPreview ? (
                          <PremiumAvatar src={avatarPreview} size="xl" />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-4xl">
                            👤
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('camera-input')?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Camera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('avatar-input')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Gallery
                        </Button>
                      </div>

                      <input
                        id="camera-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                      />
                      <input
                        id="avatar-input"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Display Name *
                          {fieldStatus.display_name === 'valid' && (
                            <CheckCircle2 className="inline ml-2 w-4 h-4 text-green-500" />
                          )}
                          {fieldStatus.display_name === 'invalid' && (
                            <XCircle className="inline ml-2 w-4 h-4 text-red-500" />
                          )}
                        </label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your name"
                        />
                        {validationErrors.display_name && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.display_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Bio</label>
                        <Textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell us about yourself"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Country *</label>
                        <Input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Your country"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Phone Number</label>
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+234 XXX XXX XXXX"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      {hasBackup && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRestoreBackup}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearBackup}
                          >
                            Clear Backup
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePreview}
                        className="ml-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={uploading}
                      >
                        {uploading ? "Saving..." : "Continue"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Profile Completion */}
              <div className="lg:col-span-1">
                {existingProfile && (
                  <ProfileCompletion profile={profile || existingProfile} onRefresh={loadProfile} />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};
