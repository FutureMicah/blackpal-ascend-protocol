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
      className="glass-card p-6 space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Avatar */}
      <div className="flex justify-center">
        <PremiumAvatar
          src={profile.avatar_url || undefined}
          alt={profile.display_name}
          size={140}
        />
      </div>

      {/* Name & Handle */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          {profile.display_name}
        </h1>
        {profile.username && (
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        )}
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate(`/profile/${user.id}`)}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          View Public Profile
        </Button>
      </div>

      {/* Citizenship Badge */}
      <div className="flex justify-center">
        <Badge
          className={`bg-gradient-to-r ${getRankColor(profile.payment_tier)} text-white border-0 px-4 py-2`}
        >
          <span className="font-semibold">
            {profile.citizenship_rank || "Visitor"} • Rank {profile.rank_level || 1}
          </span>
        </Badge>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-muted-foreground text-center line-clamp-3">
          {profile.bio}
        </p>
      )}

      {/* Featured Achievements */}
      {featuredAchievements.length > 0 && (
        <PremiumBadges achievements={featuredAchievements} />
      )}

      {/* Edit Profile Button */}
      <ProfileEdit 
        profile={profile} 
        onUpdate={() => onProfileUpdate?.()} 
      />

      {/* Share Profile Button */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share Profile
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-background rounded-lg border">
              <QRCodeSVG
                value={profileUrl}
                size={180}
                level="H"
                includeMargin
                className="rounded-lg"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Scan to view profile
            </p>
            
            {/* Shareable Link */}
            <div className="flex gap-2">
              <Input
                value={profileUrl}
                readOnly
                className="flex-1 text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            {/* Native Share */}
            <Button onClick={handleNativeShare} className="w-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meta Info */}
      <div className="space-y-2 text-sm">
        {profile.country && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{profile.country}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {profile.xp_points || 0}
          </div>
          <div className="text-xs text-muted-foreground">XP</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {profile.rank_level || 1}
          </div>
          <div className="text-xs text-muted-foreground">Level</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {profile.streak_days || 0}
          </div>
          <div className="text-xs text-muted-foreground">Streak</div>
        </div>
      </div>

      {/* Connect to Cinematic Core */}
      <Button
        variant="default"
        className="w-full"
        onClick={() => window.open("https://blackpal-cinematic-core.lovable.app/", "_blank")}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        Cinematic Core
      </Button>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </motion.div>
  );
};
