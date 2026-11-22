import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, ProfileFormData } from "@/lib/validations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, User, Twitter, Linkedin, Github, Instagram, Eye, EyeOff, CheckCircle2, XCircle, HelpCircle, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileEditProps {
  profile: any;
  onUpdate: () => void;
  children?: React.ReactNode;
}

export const ProfileEdit = ({ profile, onUpdate, children }: ProfileEditProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [dynamicCompletion, setDynamicCompletion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | null>(null);
  const [hasReached100, setHasReached100] = useState(() => {
    try {
      if (typeof localStorage !== "undefined" && profile?.id) {
        return localStorage.getItem(`blackpal-profile-100:${profile.id}`) === "1";
      }
    } catch {}
    return !!(profile?.display_name && profile?.country);
  });
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || "",
      bio: profile?.bio || "",
      website_url: profile?.website_url || "",
      phone_number: profile?.phone_number || "",
      country: profile?.country || "",
      profile_visibility: profile?.profile_visibility || "public",
      twitter_handle: profile?.twitter_handle || "",
      linkedin_url: profile?.linkedin_url || "",
      github_handle: profile?.github_handle || "",
      instagram_handle: profile?.instagram_handle || "",
    },
  });

  const watchedFields = watch();

  useEffect(() => {
    setSaveStatus('saving');
    let completed = 0;
    let total = 10;
    
    if (watchedFields.display_name && watchedFields.display_name.length >= 2) completed++;
    if (watchedFields.country) completed++;
    if (watchedFields.bio) completed++;
    if (!watchedFields.website_url || watchedFields.website_url === '' || /^https?:\/\/.+/.test(watchedFields.website_url)) completed++;
    if (!watchedFields.phone_number || watchedFields.phone_number === '' || /^\+?[1-9]\d{1,14}$/.test(watchedFields.phone_number)) completed++;
    if (watchedFields.profile_visibility) completed++;
    if (!watchedFields.twitter_handle || watchedFields.twitter_handle.length <= 15) completed++;
    if (!watchedFields.linkedin_url || watchedFields.linkedin_url === '' || /^https?:\/\/.+/.test(watchedFields.linkedin_url)) completed++;
    if (!watchedFields.github_handle || watchedFields.github_handle.length <= 39) completed++;
    if (!watchedFields.instagram_handle || watchedFields.instagram_handle.length <= 30) completed++;
    
    const newCompletion = Math.round((completed / total) * 100);
    setDynamicCompletion(newCompletion);
    
    const timer = setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedFields]);

  const getProfileStrength = (completion: number): { label: string; color: string } => {
    if (completion < 30) return { label: "Weak", color: "text-red-500" };
    if (completion < 60) return { label: "Good", color: "text-yellow-500" };
    if (completion < 90) return { label: "Strong", color: "text-blue-500" };
    return { label: "Excellent", color: "text-green-500" };
  };

  const profileStrength = getProfileStrength(dynamicCompletion);

  useEffect(() => {
    if (dynamicCompletion === 100 && !hasReached100) {
      setHasReached100(true);
      try {
        if (profile?.id) localStorage.setItem(`blackpal-profile-100:${profile.id}`, "1");
      } catch {}

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
        title: "Profile Complete!",
        description: "Congratulations! You've completed your profile 100%",
      });
    }
  }, [dynamicCompletion, hasReached100, toast, profile?.id]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!isSubmitting && dynamicCompletion >= 20) {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    }
  }, [open, isSubmitting, dynamicCompletion]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarPreview(publicUrl);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: data.display_name,
          bio: data.bio || null,
          website_url: data.website_url || null,
          phone_number: data.phone_number || null,
          country: data.country || null,
          profile_visibility: data.profile_visibility || "public",
          twitter_handle: data.twitter_handle || null,
          linkedin_url: data.linkedin_url || null,
          github_handle: data.github_handle || null,
          instagram_handle: data.instagram_handle || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });

      onUpdate();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <User className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and avatar
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Profile Completion</span>
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
                <AnimatePresence mode="wait">
                  {saveStatus === 'saving' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
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
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-primary to-primary/80"
                initial={{ width: 0 }}
                animate={{ width: `${dynamicCompletion}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {dynamicCompletion === 100 ? 'Complete!' : `${100 - dynamicCompletion}% remaining`}
              </p>
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> to save
              </p>
            </div>
          </div>
        </TooltipProvider>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview || profile?.avatar_url} />
              <AvatarFallback>
                {profile?.display_name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2">
              <Label
                htmlFor="avatar-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Avatar
                  </>
                )}
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Max 2MB · JPG, PNG, WEBP
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name *</Label>
            <Input id="display_name" {...register("display_name")} placeholder="Enter your display name" />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} placeholder="Enter your country" />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="w-full justify-center gap-2"
          >
            {showOptionalFields ? (
              <>
                <EyeOff className="w-4 h-4" /> Hide optional fields
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" /> Show optional fields
              </>
            )}
          </Button>

          {showOptionalFields && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...register("bio")} placeholder="Tell us about yourself" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone</Label>
                <Input id="phone_number" {...register("phone_number")} placeholder="+234..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input id="website_url" {...register("website_url")} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_handle" className="flex items-center gap-2">
                  <Twitter className="w-3 h-3" /> Twitter
                </Label>
                <Input id="twitter_handle" {...register("twitter_handle")} placeholder="handle" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                  <Linkedin className="w-3 h-3" /> LinkedIn
                </Label>
                <Input id="linkedin_url" {...register("linkedin_url")} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_handle" className="flex items-center gap-2">
                  <Github className="w-3 h-3" /> GitHub
                </Label>
                <Input id="github_handle" {...register("github_handle")} placeholder="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                  <Instagram className="w-3 h-3" /> Instagram
                </Label>
                <Input id="instagram_handle" {...register("instagram_handle")} placeholder="handle" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || dynamicCompletion < 20}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
