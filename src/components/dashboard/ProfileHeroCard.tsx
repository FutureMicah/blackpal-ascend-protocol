import { motion } from "framer-motion";
import { PremiumAvatar } from "@/components/PremiumAvatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Share2, Copy, Check, LogOut, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    loadFeaturedAchievements();
  }, [user.id]);

  const loadFeaturedAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select(
          `
          achievement_id,
          achievements (
            id,
            name,
            icon,
            rarity
          )
        `
        )
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
    toast({ title: "Signed out", description: "You have been signed out successfully" });
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
      className="glass-card p-2.5 sm:p-4 space-y-2.5 sm:space-y-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Avatar */}
      <div className="flex justify-center">
        <PremiumAvatar src={profile.avatar_url || undefined} alt={profile.display_name} size={72} />
      </div>

      {/* Name & handle — smaller but bold on mobile */}
      <div className="text-center space-y-0.5 px-1">
        <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground truncate leading-tight">
          {profile.display_name}
        </h1>
        {profile.username && (
          <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
            @{profile.username}
          </p>
        )}
      </div>

      {/* Rank badge */}
      <div className="flex justify-center">
        <Badge
          className={`bg-gradient-to-r ${getRankColor(profile.payment_tier)} text-white border-0 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wide`}
        >
          {profile.citizenship_rank || "Visitor"} · L{profile.rank_level || 1}
        </Badge>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground text-center line-clamp-2 px-1 leading-snug">
          {profile.bio}
        </p>
      )}

      {/* Achievements strip */}
      {featuredAchievements.length > 0 && (
        <div className="overflow-hidden">
          <PremiumBadges achievements={featuredAchievements} />
        </div>
      )}

      {/* Compact icon action bar — one row, no clutter */}
      <div className="flex items-center justify-center gap-1.5 pt-0.5">
        <ProfileEdit profile={profile} onUpdate={() => onProfileUpdate?.()}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[10px] sm:text-xs font-bold gap-1"
          >
            Edit
          </Button>
        </ProfileEdit>

        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Share profile"
              title="Share"
            >
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

      {/* Meta — tight */}
      <div className="space-y-1 text-[10px] sm:text-[11px] font-semibold px-0.5">
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border">
        <div className="text-center">
          <div className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
            {Number(profile.xp_points || 0).toLocaleString()}
          </div>
          <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            XP
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
            {profile.rank_level || 1}
          </div>
          <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Level
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs sm:text-sm font-extrabold text-foreground tabular-nums">
            {profile.streak_days || profile.achievement_streak || 0}
          </div>
          <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Streak
          </div>
        </div>
      </div>
    </motion.div>
  );
};
