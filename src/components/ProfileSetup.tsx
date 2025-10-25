import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check } from "lucide-react";

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

export const ProfileSetup = ({ userId, onComplete }: ProfileSetupProps) => {
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
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

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
          country: country || null
        });

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

  const isComplete = displayName.trim().length > 0;

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
              CONSTRUCT YOUR IDENTITY.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload - Central Circular Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center mb-6"
            >
              <div className="relative">
                {/* Rotating glow ring */}
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

                {/* Upload zone */}
                <label
                  htmlFor="avatar-upload"
                  className="relative flex items-center justify-center w-32 h-32 rounded-full cursor-pointer overflow-hidden bg-background/50 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/40 transition-all group"
                >
                  {avatarPreview ? (
                    <motion.img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
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
            </motion.div>

            {/* Display Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="displayName" className="text-sm font-medium text-muted-foreground">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="voltage-input"
                placeholder="Enter your name"
                required
              />
              {displayName && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-primary"
                >
                  Identity: {displayName} [Confirmed]
                </motion.p>
              )}
            </motion.div>

            {/* Country (Optional) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <Label htmlFor="country" className="text-sm font-medium text-muted-foreground">
                Country <span className="text-xs">(Optional)</span>
              </Label>
              <Input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="voltage-input"
                placeholder="Your location"
              />
              {country && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-primary"
                >
                  Region: {country} [Connected]
                </motion.p>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full voltage-button"
                size="lg"
                disabled={!isComplete || uploading}
              >
                {uploading ? "Initializing..." : "Complete Setup"}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};
