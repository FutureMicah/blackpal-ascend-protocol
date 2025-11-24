import { motion } from "framer-motion";
import { X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumAvatar } from "./PremiumAvatar";
import { Badge } from "@/components/ui/badge";

interface ProfilePreviewProps {
  displayName: string;
  bio?: string;
  country?: string;
  avatarUrl?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ProfilePreview = ({
  displayName,
  bio,
  country,
  avatarUrl,
  onClose,
  onConfirm
}: ProfilePreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-2xl"
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-12 right-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Preview Card */}
        <div className="p-8 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Profile Preview</h2>
            <p className="text-sm text-muted-foreground">
              This is how other users will see your profile
            </p>
          </div>

          {/* Profile Display */}
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <PremiumAvatar
                src={avatarUrl}
                alt={displayName}
                size={160}
              />
            </div>

            {/* Name and Country */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-3xl font-bold">{displayName}</h3>
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              {country && (
                <Badge variant="outline" className="text-sm">
                  📍 {country}
                </Badge>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-center text-muted-foreground leading-relaxed">
                  {bio}
                </p>
              </div>
            )}

            {/* Stats Preview */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-xs text-muted-foreground">Achievements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">0</div>
                <div className="text-xs text-muted-foreground">XP Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">Visitor</div>
                <div className="text-xs text-muted-foreground">Rank</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Edit Profile
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
            >
              Looks Good, Continue
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
