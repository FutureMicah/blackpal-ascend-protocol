import { motion } from "framer-motion";
import { MapPin, Calendar, Share2, Copy, Check, LogOut, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ProfileEdit } from "@/components/ProfileEdit";
import { NFTProfileCard } from "@/components/NFTProfileCard";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";

interface ProfileHeroCardProps {
  profile: any;
  user: any;
  onProfileUpdate?: () => void;
}

export const ProfileHeroCard = ({ profile, user, onProfileUpdate }: ProfileHeroCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNftModal, setShowNftModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = `${window.location.origin}/profile/${user.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Profile link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Failed to copy link" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.display_name}'s BlackPal Profile`,
          text: `Check out ${profile.display_name}'s profile on BlackPal`,
          url: profileUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully" });
    navigate("/");
  };

  return (
    <motion.div
      className="space-y-2.5 sm:space-y-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Collectible NFT identity card - always visible */}
      <button
        type="button"
        onClick={() => setShowNftModal(true)}
        className="w-full text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        title="Open full collectible card"
      >
        <NFTProfileCard userId={user.id} embedded compact />
      </button>

      <p className="text-[9px] font-bold tracking-wide text-muted-foreground text-center px-1">
        Your profile card · display only · tap to expand
      </p>

      {/* Compact action bar */}
      <div className="glass-card p-2 flex items-center justify-center gap-1.5">
        <ProfileEdit profile={profile} onUpdate={() => onProfileUpdate?.()}>
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-[10px] sm:text-xs font-bold gap-1">
            Edit
          </Button>
        </ProfileEdit>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Expand NFT card"
          title="Full card"
          onClick={() => setShowNftModal(true)}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>

        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Share profile" title="Share">
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-w-[92vw]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Share profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex justify-center p-3 bg-background rounded-lg border">
                <QRCodeSVG value={profileUrl} size={160} level="H" includeMargin className="rounded-lg" />
              </div>
              <p className="text-center text-xs font-semibold text-muted-foreground">Scan to view</p>
              <div className="flex gap-2">
                <Input
                  value={profileUrl}
                  readOnly
                  className="flex-1 text-[11px] font-medium h-9"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button onClick={handleNativeShare} className="w-full h-9 text-xs font-bold">
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Share
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Public profile"
          title="Public profile"
          onClick={() => navigate(`/profile/${user.id}`)}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Sign out"
          title="Sign out"
          onClick={handleSignOut}
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Meta */}
      <div className="glass-card p-2.5 space-y-1 text-[10px] sm:text-[11px] font-semibold">
        {profile.country && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{profile.country}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="truncate">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Full NFT modal */}
      {showNftModal && <NFTProfileCard userId={user.id} onClose={() => setShowNftModal(false)} />}
    </motion.div>
  );
};
