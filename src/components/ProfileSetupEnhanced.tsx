import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GeoData, detectGeo, calculatePaymentTier } from "@/lib/geo";
import { profileSchema } from "@/lib/validations";
import { Upload, CheckCircle2, XCircle, Camera, Eye, EyeOff, Download, RotateCcw, Share2, History, Palette, TrendingUp, Users, BarChart3, HelpCircle, Save, Loader2 as LoaderIcon, Diamond, AlertTriangle, Sparkles, Undo2 } from "lucide-react";
import { NFTProfileCard } from "./NFTProfileCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import confetti from "canvas-confetti";
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
import { ProfileSuggestions } from "./ProfileSuggestions";
import { ProfileShowcase } from "./ProfileShowcase";
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
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [stylizing, setStylizing] = useState(false);
  const [is3DAvatar, setIs3DAvatar] = useState(false);
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showShowcase, setShowShowcase] = useState(false);
  const [showNFTCard, setShowNFTCard] = useState(false);
  const [profile, setProfile] = useState<any>(existingProfile);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalXP: 0, totalAchievements: 0, rareAchievements: 0 });
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | null>(null);
  const [hasReached100, setHasReached100] = useState(false);
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

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      saveProfileBackup({
        displayName,
        bio,
        country,
        phoneNumber,
        avatarPreview: avatarPreview || undefined
      });
      setHasBackup(true);
      setSaveStatus('saved');
      
      // Hide saved status after 2 seconds
      setTimeout(() => setSaveStatus(null), 2000);
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

  // Real-time validation for country
  useEffect(() => {
    if (!country) {
      setFieldStatus(prev => ({ ...prev, country: null }));
      return;
    }

    const timer = setTimeout(() => {
      if (country.trim().length >= 2) {
        setFieldStatus(prev => ({ ...prev, country: 'valid' }));
        setValidationErrors(prev => {
          const { country, ...rest } = prev;
          return rest;
        });
      } else {
        setFieldStatus(prev => ({ ...prev, country: 'invalid' }));
        setValidationErrors(prev => ({
          ...prev,
          country: "Country is required"
        }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [country]);

  // Real-time validation for phone number (optional)
  useEffect(() => {
    if (!phoneNumber || phoneNumber === '') {
      setFieldStatus(prev => ({ ...prev, phone_number: null }));
      setValidationErrors(prev => {
        const { phone_number, ...rest } = prev;
        return rest;
      });
      return;
    }

    const timer = setTimeout(() => {
      const result = profileSchema.shape.phone_number.safeParse(phoneNumber);
      setFieldStatus(prev => ({ 
        ...prev, 
        phone_number: result.success ? 'valid' : 'invalid' 
      }));
      
      if (!result.success) {
        setValidationErrors(prev => ({
          ...prev,
          phone_number: result.error.issues[0].message
        }));
      } else {
        setValidationErrors(prev => {
          const { phone_number, ...rest } = prev;
          return rest;
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [phoneNumber]);

  // Real-time validation for bio (optional)
  useEffect(() => {
    if (!bio || bio === '') {
      setFieldStatus(prev => ({ ...prev, bio: null }));
      setValidationErrors(prev => {
        const { bio, ...rest } = prev;
        return rest;
      });
      return;
    }

    const timer = setTimeout(() => {
      const result = profileSchema.shape.bio.safeParse(bio);
      setFieldStatus(prev => ({ 
        ...prev, 
        bio: result.success ? 'valid' : 'invalid' 
      }));
      
      if (!result.success) {
        setValidationErrors(prev => ({
          ...prev,
          bio: result.error.issues[0].message
        }));
      } else {
        setValidationErrors(prev => {
          const { bio, ...rest } = prev;
          return rest;
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [bio]);

  // Calculate dynamic completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    let total = 4; // display_name, country, bio, phone (all fields including optional)
    
    if (displayName && fieldStatus.display_name === 'valid') completed++;
    if (country && fieldStatus.country === 'valid') completed++;
    if (bio && fieldStatus.bio !== 'invalid') completed++;
    if (phoneNumber === '' || (phoneNumber && fieldStatus.phone_number !== 'invalid')) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const dynamicCompletion = calculateCompletion();

  // Get profile strength label
  const getProfileStrength = (completion: number): { label: string; color: string } => {
    if (completion < 30) return { label: "Weak", color: "text-red-500" };
    if (completion < 60) return { label: "Good", color: "text-yellow-500" };
    if (completion < 90) return { label: "Strong", color: "text-blue-500" };
    return { label: "Excellent", color: "text-green-500" };
  };

  const profileStrength = getProfileStrength(dynamicCompletion);

  // Trigger confetti when reaching 100% for the first time
  useEffect(() => {
    if (dynamicCompletion === 100 && !hasReached100) {
      setHasReached100(true);
      
      // Trigger confetti celebration
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      toast({
        title: "🎉 Profile Complete!",
        description: "Congratulations! You've completed your profile 100%",
      });
    }
  }, [dynamicCompletion, hasReached100, toast]);

  // Handle form submission with Enter key
  const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter key submits (but not in textarea)
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      if (!uploading && dynamicCompletion >= 50) {
        e.preventDefault();
        handleSubmit();
      }
    }
  }, [uploading, dynamicCompletion]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape to close modals or cancel
    if (e.key === 'Escape') {
      if (showPreview) setShowPreview(false);
      else if (showImageEditor) {
        setShowImageEditor(false);
        setTempImageForEdit(null);
      } else if (showShareModal) setShowShareModal(false);
      else if (showHistory) setShowHistory(false);
      else if (showThemeCustomizer) setShowThemeCustomizer(false);
      else if (showAnalytics) setShowAnalytics(false);
      else if (showSocialShare) setShowSocialShare(false);
      else if (showComparison) setShowComparison(false);
      else if (showNFTCard) setShowNFTCard(false);
    }
    
    // Ctrl/Cmd + Enter to submit (backup shortcut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!uploading && dynamicCompletion >= 50) {
        e.preventDefault();
        handleSubmit();
      }
    }
  }, [showPreview, showImageEditor, showShareModal, showHistory, showThemeCustomizer, 
      showAnalytics, showSocialShare, showComparison, showNFTCard, uploading, dynamicCompletion]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  const stylizeTo3D = async (sourceDataUrl: string) => {
    setStylizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("stylize-avatar-3d", {
        body: { imageUrl: sourceDataUrl },
      });
      if (error) throw error;
      const stylized = (data as any)?.stylizedImageUrl;
      if (!stylized) throw new Error("AI did not return an avatar");

      setAvatarPreview(stylized);
      setIs3DAvatar(true);
      const res = await fetch(stylized);
      const blob = await res.blob();
      setAvatarFile(new File([blob], "avatar-3d.png", { type: blob.type || "image/png" }));
      toast({ title: "3D avatar ready", description: "Your photo was stylized into a 3D character." });
    } catch (err: any) {
      console.error("stylize failed", err);
      toast({
        variant: "destructive",
        title: "3D stylization failed",
        description: err?.message || "Kept your original photo. You can retry from the preview.",
      });
    } finally {
      setStylizing(false);
    }
  };

  const handleImageEdited = (editedImageUrl: string) => {
    // Show original immediately so user has feedback while AI runs
    setOriginalPhotoUrl(editedImageUrl);
    setAvatarPreview(editedImageUrl);
    setIs3DAvatar(false);
    fetch(editedImageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        setAvatarFile(file);
      });
    setShowImageEditor(false);
    setTempImageForEdit(null);
    // Fire-and-forget the 3D stylization
    void stylizeTo3D(editedImageUrl);
  };

  const revertToOriginal = () => {
    if (!originalPhotoUrl) return;
    setAvatarPreview(originalPhotoUrl);
    setIs3DAvatar(false);
    fetch(originalPhotoUrl)
      .then((r) => r.blob())
      .then((b) => setAvatarFile(new File([b], "avatar.jpg", { type: "image/jpeg" })));
  };

  const restylize = () => {
    if (originalPhotoUrl) void stylizeTo3D(originalPhotoUrl);
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
          theme_custom_pattern_url: theme.customPatternUrl ?? null,
        } as any)
        .eq("id", userId);

      if (error) throw error;

      // Broadcast so GlobalThemeProvider re-applies the new theme app-wide
      window.dispatchEvent(new CustomEvent("blackpal:theme-saved"));

      toast({
        title: "Theme saved!",
        description: "Your new theme is now live across the entire app.",
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

      let avatarUrl: string | null = existingProfile?.avatar_url ?? null;
      const { toast: sonner } = await import("sonner");
      let syncToastId: string | number | undefined;

      if (avatarFile) {
        syncToastId = sonner.loading("Syncing 3D avatar across BLACKPAL…", {
          description: "Uploading and propagating to Atlas pins, profile cards, chat & friends.",
        });
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true, cacheControl: '0' });

        if (uploadError) {
          if (syncToastId) sonner.dismiss(syncToastId);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Cache-bust so every consumer (including the 3D NFT avatar) re-fetches the new image
        avatarUrl = `${publicUrl}?v=${Date.now()}`;
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

      if (profileError) {
        if (syncToastId) sonner.dismiss(syncToastId);
        throw profileError;
      }

      // Mirror new avatar to user_locations so Atlas 3D pins refresh everywhere
      if (avatarFile && avatarUrl) {
        await supabase
          .from('user_locations')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      }

      if (syncToastId) {
        sonner.success("3D avatar synced everywhere", {
          id: syncToastId,
          description: "Visible across your profile, friends, chat & Atlas pins.",
        });
      }

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
              customPatternUrl: (existingProfile as any).theme_custom_pattern_url || null,
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

      <AnimatePresence>
        {showNFTCard && (
          <NFTProfileCard
            userId={userId}
            onClose={() => setShowNFTCard(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative z-10 min-h-screen flex items-start justify-center p-4 bg-background overflow-y-auto py-8"
      >
        <div className="w-full max-w-5xl px-2 sm:px-4">
          <motion.div
            className="relative z-20 p-4 sm:p-6 md:p-8 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <h2 className="text-3xl font-bold text-center mb-2">
              {existingProfile ? 'Complete Your Profile' : 'Create Your Identity'}
            </h2>
            <p className="text-center text-muted-foreground mb-4">
              Your profile in the BTA Digital Republic
            </p>

            {/* Dynamic Progress Bar with Strength Indicator */}
            <TooltipProvider>
              <div className="mb-6 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Profile Completion</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Complete more fields to strengthen your profile</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Autosave Status Indicator */}
                    <AnimatePresence mode="wait">
                      {saveStatus === 'saving' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <LoaderIcon className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </motion.div>
                      )}
                      {saveStatus === 'saved' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1 text-xs text-green-500"
                        >
                          <Save className="w-3 h-3" />
                          <span>Saved</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <span className="text-sm font-bold text-primary">{dynamicCompletion}%</span>
                    <span className={`text-xs font-semibold ${profileStrength.color}`}>
                      {profileStrength.label}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-primary/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${dynamicCompletion}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {dynamicCompletion === 100 ? '🎉 Profile complete!' : 'Fill in all fields to complete your profile'}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> or tap Continue
                  </p>
                </div>
              </div>
            </TooltipProvider>

            {/* Action buttons - Mobile responsive grid with scroll protection */}
            {existingProfile && (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2 mb-4 sm:mb-6 relative z-30 px-1">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowHistory(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2"
                >
                  <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">History</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAnalytics(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2"
                >
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowThemeCustomizer(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2"
                >
                  <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">Theme</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowShareModal(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">QR</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSocialShare(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowComparison(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">Compare</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowNFTCard(true);
                  }}
                  className="touch-manipulation flex flex-col items-center justify-center h-14 sm:h-auto sm:flex-row gap-0.5 sm:gap-2 text-[10px] sm:text-sm p-1 sm:p-2 bg-gradient-to-r from-primary to-secondary col-span-4 sm:col-span-1"
                >
                  <Diamond className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="leading-tight">NFT Card</span>
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
                      {/* Face-photo reminder */}
                      <div className="w-full flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] sm:text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="leading-snug">
                          <strong className="block text-amber-100">Upload an ACTUAL photo of your face.</strong>
                          Your selfie is automatically transformed into a 3D Memoji-style avatar
                          that preserves your real likeness. Fake, group, cartoon, celebrity, or
                          non-face images will produce a broken avatar and may be removed by moderators.
                        </div>
                      </div>

                      <div className="relative">
                        {avatarPreview ? (
                          <PremiumAvatar src={avatarPreview} size={128} />
                        ) : (
                          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-4xl">
                            👤
                          </div>
                        )}
                        {avatarPreview && avatarFile && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 rounded-full border border-amber-400/60 bg-black/80 px-2 py-0.5 text-[9px] font-black tracking-[0.2em] text-amber-200 shadow-[0_0_12px_-2px_rgba(251,191,36,0.6)] animate-pulse">
                            LIVE PREVIEW · UNSAVED
                          </div>
                        )}
                        {stylizing && (
                          <div className="absolute inset-0 rounded-full bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-[10px] text-primary">
                            <LoaderIcon className="w-6 h-6 animate-spin" />
                            <span>Sculpting 3D…</span>
                          </div>
                        )}
                        {is3DAvatar && !stylizing && (
                          <div className="absolute -bottom-1 -right-1 rounded-full bg-primary text-primary-foreground p-1 shadow-lg">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('camera-input')?.click()}
                          disabled={stylizing}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Camera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('avatar-input')?.click()}
                          disabled={stylizing}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Gallery
                        </Button>
                        {originalPhotoUrl && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={restylize}
                              disabled={stylizing}
                              title="Generate a new 3D avatar from your original photo"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Re-stylize
                            </Button>
                            {is3DAvatar && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={revertToOriginal}
                                disabled={stylizing}
                                title="Use the original photo instead"
                              >
                                <Undo2 className="w-4 h-4 mr-2" />
                                Use original
                              </Button>
                            )}
                          </>
                        )}
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
                        <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Display Name *</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Minimum 2 characters required</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <AnimatePresence mode="wait">
                            {fieldStatus.display_name === 'valid' && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </motion.div>
                            )}
                            {fieldStatus.display_name === 'invalid' && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onKeyDown={handleFormKeyDown}
                          placeholder="Enter your name"
                        />
                        {validationErrors.display_name && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.display_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>Country *</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Enter your country name</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <AnimatePresence mode="wait">
                            {fieldStatus.country === 'valid' && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              </motion.div>
                            )}
                            {fieldStatus.country === 'invalid' && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </label>
                        <Input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          onKeyDown={handleFormKeyDown}
                          placeholder="Your country"
                        />
                        {validationErrors.country && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.country}</p>
                        )}
                      </div>

                      {/* Toggle for Optional Fields */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOptionalFields(!showOptionalFields)}
                        className="w-full justify-center gap-2"
                      >
                        {showOptionalFields ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Hide Optional Fields
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Show Optional Fields
                          </>
                        )}
                      </Button>

                      {showOptionalFields && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span>Bio</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Tell others about yourself (optional)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <AnimatePresence mode="wait">
                                {fieldStatus.bio === 'valid' && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  </motion.div>
                                )}
                                {fieldStatus.bio === 'invalid' && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </label>
                            <Textarea
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Tell us about yourself"
                              rows={3}
                              className="resize-none"
                            />
                            {validationErrors.bio && (
                              <p className="text-sm text-red-500 mt-1">{validationErrors.bio}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span>Phone Number</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Format: +[country code][number] (optional)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <AnimatePresence mode="wait">
                                {fieldStatus.phone_number === 'valid' && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  </motion.div>
                                )}
                                {fieldStatus.phone_number === 'invalid' && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </label>
                            <Input
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              onKeyDown={handleFormKeyDown}
                              placeholder="+234 XXX XXX XXXX"
                            />
                            {validationErrors.phone_number && (
                              <p className="text-sm text-red-500 mt-1">{validationErrors.phone_number}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons - Mobile responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      {hasBackup && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRestoreBackup}
                            className="flex-1 sm:flex-none"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleClearBackup}
                            className="flex-1 sm:flex-none"
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 sm:ml-auto">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePreview}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={uploading || dynamicCompletion < 50}
                          className="flex-1 sm:flex-none min-w-[100px]"
                        >
                          {uploading ? "Saving..." : "Continue"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Profile Completion */}
              <div className="lg:col-span-1 space-y-6">
                {existingProfile && (
                  <>
                    <ProfileCompletion profile={profile || existingProfile} onRefresh={loadProfile} />
                    
                    <ProfileSuggestions 
                      profile={profile || existingProfile}
                      onActionClick={(action) => {
                        // Handle suggestion actions
                        if (action === 'customize_theme') setShowThemeCustomizer(true);
                        if (action === 'upload_photo') document.getElementById('avatar-input')?.click();
                        toast({
                          title: "Action Suggested",
                          description: "Scroll up to complete this action in the form.",
                        });
                      }}
                    />
                    
                    <ProfileShowcase 
                      profile={profile || existingProfile}
                      userId={userId}
                      onUpdate={loadProfile}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};
