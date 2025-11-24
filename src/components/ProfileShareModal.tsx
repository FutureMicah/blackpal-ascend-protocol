import { motion } from "framer-motion";
import { X, Copy, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

interface ProfileShareModalProps {
  userId: string;
  displayName: string;
  onClose: () => void;
}

export const ProfileShareModal = ({ userId, displayName, onClose }: ProfileShareModalProps) => {
  const [copied, setCopied] = useState(false);
  
  // Generate shareable profile URL
  const profileUrl = `${window.location.origin}/profile/${userId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}'s BlackPal Profile`,
          text: `Check out ${displayName}'s profile on BlackPal`,
          url: profileUrl,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-lg"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Share Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6 p-6 bg-background rounded-lg">
          <QRCodeSVG
            value={profileUrl}
            size={200}
            level="H"
            includeMargin
            className="rounded-lg"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mb-6">
          Scan this QR code to view the profile
        </p>

        {/* Shareable Link */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Profile Link</label>
          <div className="flex gap-2">
            <Input
              value={profileUrl}
              readOnly
              className="flex-1"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Share Button */}
        <Button
          onClick={handleShare}
          className="w-full mt-6"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Profile
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Anyone with this link can view your public profile
        </p>
      </motion.div>
    </motion.div>
  );
};
