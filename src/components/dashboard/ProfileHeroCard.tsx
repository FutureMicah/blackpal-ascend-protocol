import { motion } from "framer-motion";
import { PremiumAvatar } from "@/components/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, LogOut, ExternalLink, Share2, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PremiumBadges } from "@/components/PremiumBadges";
import { ProfileEdit } from "@/components/ProfileEdit";
import { useState, useEffect } from "react";
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
  const [featuredAchievements, setFeaturedAchievements] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const profileUrl = `${window.location.origin}/profile/${user.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({ title: "Link copied!", description: "Profile link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
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
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  useEffect(() => {
    loadFeaturedAchievements();
  }, [user.id]);

  const loadFeaturedAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select(`
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity
          )
        `)
        .eq("user_id", user.id)
        .limit(5);

      if (error) throw error;

      const achievements = data?.map((ua: any) => ua.achievements).filter(Boolean) || [];
      setFeaturedAchievements(achievements);
    } catch (error) {
      console.error("Error loading featured achievements:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/");
  };

  const getRankColor = (tier: string) => {
    if (!tier) return "from-violet-500 to-purple-500";
    if (tier === "NIGERIA") return "from-green-500 to-emerald-500";
    if (tier === "AFRICA") return "from-orange-500 to-amber-500";
    return "from-violet-500 to-purple-500";
  };

  return (
    <motion.div
      className="glass-card p-3 sm:p-4 space-y-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Avatar */}
      <div className="flex justify-center">
        <PremiumAvatar
          src={profile.avatar_url || undefined}
          alt={profile.display_name}
          size={84}
        />
      </div>

      {/* Name & Handle */}
      <div className="text-center space-y-0.5">
        <h1 className="text-base font-bold text-foreground truncate">
          {profile.display_name}
        </h1>
        {profile.username && (
          <p className="text-[11px] text-muted-foreground truncate">@{profile.username}</p>
        )}
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate(`/profile/${user.id}`)}
          className="text-[10px] h-auto py-0 text-muted-foreground hover:text-primary"
        >
          View Public Profile
        </Button>
      </div>

      {/* Citizenship Badge */}
      <div className="flex justify-center">
        <Badge
          className={`bg-gradient-to-r ${getRankColor(profile.payment_tier)} text-white border-0 px-2.5 py-1 text-[10px]`}
        >
          <span className="font-semibold">
            {profile.citizenship_rank || "Visitor"} • L{profile.rank_level || 1}
          </span>
        </Badge>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-[11px] text-muted-foreground text-center line-clamp-2">
          {profile.bio}
        </p>
      )}

      {/* Featured Achievements */}
      {featuredAchievements.length > 0 && (
        <PremiumBadges achievements={featuredAchievements} />
      )}

      {/* Action buttons — compact row */}
      <div className="grid grid-cols-2 gap-2">
        <ProfileEdit
          profile={profile}
          onUpdate={() => onProfileUpdate?.()}
        />
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs px-2">
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Your Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-background rounded-lg border">
                <QRCodeSVG value={profileUrl} size={180} level="H" includeMargin className="rounded-lg" />
              </div>
              <p className="text-center text-sm text-muted-foreground">Scan to view profile</p>
              <div className="flex gap-2">
                <Input value={profileUrl} readOnly className="flex-1 text-sm" onClick={(e) => e.currentTarget.select()} />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button onClick={handleNativeShare} className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meta Info */}
      <div className="space-y-1 text-[11px]">
        {profile.country && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{profile.country}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span className="truncate">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{profile.xp_points || 0}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">XP</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{profile.rank_level || 1}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Level</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">{profile.streak_days || 0}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Streak</div>
        </div>
      </div>

      {/* Sign-out lives in the header now (top-right). Cinematic Core has been
          renamed to Contest — surfaced from the bottom tab bar with a coming-soon state. */}
    </motion.div>
  );
};
