import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, ArrowRight, ArrowLeft } from "lucide-react";

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

export const ProfileSetup = ({ userId, onComplete }: ProfileSetupProps) => {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubHandle, setGithubHandle] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private" | "friends">("public");
  const [showEmail, setShowEmail] = useState(false);
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "system">("system");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

    try {
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

      // Profile row already exists (created by handle_new_user trigger).
      // Upsert by id so we update existing fields and stay idempotent.
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: displayName,
          full_name: displayName,
          email: authUser?.email ?? null,
          username: username || null,
          avatar_url: avatarUrl,
          country: country || null,
          bio: bio || null,
          date_of_birth: dateOfBirth || null,
          phone_number: phoneNumber || null,
          language,
          timezone: timezone || null,
          website_url: websiteUrl || null,
          twitter_handle: twitterHandle || null,
          linkedin_url: linkedinUrl || null,
          github_handle: githubHandle || null,
          instagram_handle: instagramHandle || null,
          profile_visibility: profileVisibility,
          show_email: showEmail,
          theme_preference: themePreference
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      toast({
        title: "Identity Created",
        description: "Your profile has been initialized.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const isStep1Complete = displayName.trim().length > 0;
  const isStep2Complete = username.trim().length > 0;

  const canProceedToNextStep = () => {
    if (step === 1) return isStep1Complete;
    if (step === 2) return isStep2Complete;
    return true;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-white/10 p-8 backdrop-blur-xl"
          style={{
            background: "linear-gradient(135deg, hsl(var(--glass-blur) / 0.6), hsl(var(--glass-blur) / 0.4))",
            boxShadow: "var(--shadow-glass), inset 0 0 60px hsl(var(--primary) / 0.05)",
          }}
        >
          {/* Holographic reflection */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)",
              mixBlendMode: "overlay"
            }}
          />

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-semibold mb-2">
              PROFILE INITIALIZATION
            </h2>
            <p className="text-primary font-light tracking-wide">
              STEP {step} OF 4 - CONSTRUCT YOUR IDENTITY.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Avatar Upload */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--primary-glow)), hsl(var(--primary)))",
                        padding: "3px",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-full h-full rounded-full bg-background" />
                    </motion.div>

                    <label
                      htmlFor="avatar-upload"
                      className="relative flex items-center justify-center w-32 h-32 rounded-full cursor-pointer overflow-hidden bg-background/50 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40 transition-all group"
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                          <Upload className="w-8 h-8" />
                          <span className="text-xs">Upload</span>
                        </div>
                      )}
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {avatarPreview && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 mt-3 text-sm text-primary"
                    >
                      <Check className="w-4 h-4" />
                      <span>Image Captured</span>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground">
                    Display Name *
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="voltage-input"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-sm font-medium text-muted-foreground">
                    Country
                  </Label>
                  <Input
                    id="country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="voltage-input"
                    placeholder="Your location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium text-muted-foreground">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="voltage-input min-h-[100px]"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Contact & Personal */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-muted-foreground">
                    Username *
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="voltage-input"
                    placeholder="unique_username"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium text-muted-foreground">
                    Phone Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="voltage-input"
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-sm font-medium text-muted-foreground">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="voltage-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-medium text-muted-foreground">
                      Language
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="voltage-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-medium text-muted-foreground">
                      Timezone
                    </Label>
                    <Input
                      id="timezone"
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="voltage-input"
                      placeholder="UTC+0"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Social Links */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="text-sm font-medium text-muted-foreground">
                    Website URL
                  </Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="voltage-input"
                    placeholder="https://yoursite.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitterHandle" className="text-sm font-medium text-muted-foreground">
                    Twitter Handle
                  </Label>
                  <Input
                    id="twitterHandle"
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                    className="voltage-input"
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="text-sm font-medium text-muted-foreground">
                    LinkedIn URL
                  </Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="voltage-input"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="githubHandle" className="text-sm font-medium text-muted-foreground">
                    GitHub Handle
                  </Label>
                  <Input
                    id="githubHandle"
                    type="text"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    className="voltage-input"
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagramHandle" className="text-sm font-medium text-muted-foreground">
                    Instagram Handle
                  </Label>
                  <Input
                    id="instagramHandle"
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="voltage-input"
                    placeholder="@username"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Privacy & Preferences */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="profileVisibility" className="text-sm font-medium text-muted-foreground">
                    Profile Visibility
                  </Label>
                  <Select value={profileVisibility} onValueChange={(value: "public" | "private" | "friends") => setProfileVisibility(value)}>
                    <SelectTrigger className="voltage-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="themePreference" className="text-sm font-medium text-muted-foreground">
                    Theme Preference
                  </Label>
                  <Select value={themePreference} onValueChange={(value: "light" | "dark" | "system") => setThemePreference(value)}>
                    <SelectTrigger className="voltage-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-background/50">
                  <div className="space-y-1">
                    <Label htmlFor="showEmail" className="text-sm font-medium">
                      Show Email on Profile
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Let others see your email address
                    </p>
                  </div>
                  <Switch
                    id="showEmail"
                    checked={showEmail}
                    onCheckedChange={setShowEmail}
                  />
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  variant="outline"
                  className="flex-1"
                  disabled={uploading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex-1 voltage-button"
                  disabled={!canProceedToNextStep()}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 voltage-button"
                  disabled={!isStep1Complete || !isStep2Complete || uploading}
                >
                  {uploading ? "Initializing..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};
